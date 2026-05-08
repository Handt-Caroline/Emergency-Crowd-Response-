const pool = require('../config/database');
const { getRequirements, getCombinedRequirements, getOtherWithKeywords } = require('../utils/categoryMapper');

/**
 * DispatchEngine — Singleton (Creational design pattern)
 *
 * Ranks all qualifying hospitals near a bystander based on distance and capacity.
 * Returns the BEST (single) hospital for primary dispatch, AND the TOP 3 hospitals
 * for the bystander to see as backup options.
 */
class DispatchEngine {

  constructor() {
    this.searchRadiusMetres = 10000; // 10km radius
    this.distanceWeight    = 0.6;
    this.capacityWeight    = 0.4;
    this.topNForBystander  = 3;      // Number of "backup" hospitals shown to bystander
  }

  // ────────────────────────────────────────────────────────────────────
  // findBestHospital(alert, excludeIds = [])
  // Returns { winner, top3 } where:
  //   - winner: the BEST single hospital (for real-time dispatch)
  //   - top3:   array of up to 3 best hospitals (for bystander to see as options)
  //
  // Backward compatible: if you treat the returned object as the winner directly,
  // it still works because we attach all winner properties.
  // ────────────────────────────────────────────────────────────────────
  async findBestHospital(alert, excludeIds = []) {

    // STEP 1: Build requirements based on situation
    // Handles: single symptom, multi-symptom (comma), and "OTHER: <text>"
    const situation = alert.situation || '';
    let requirements;

    if (situation.startsWith('OTHER:')) {
      const description = situation.substring(6).trim();
      requirements = getOtherWithKeywords(description);
    } else if (situation.includes(',')) {
      const symptomList = situation.split(',').map(s => s.trim()).filter(Boolean);
      requirements = getCombinedRequirements(symptomList);
    } else {
      requirements = getRequirements(situation);
    }

    // STEP 2: Get all hospitals within radius matching equipment + personnel
    const candidates = await this.getCandidates(
      alert.latitude,
      alert.longitude,
      requirements.requiredEquipment,
      requirements.requiredPersonnel,
      excludeIds
    );

    if (candidates.length === 0) {
      console.log(`[DISPATCH] ❌ No qualifying hospital found within ${this.searchRadiusMetres/1000}km for situation: ${situation}`);
      console.log(`[DISPATCH]    Bystander GPS: lat=${alert.latitude}, lng=${alert.longitude}`);
      if (excludeIds.length > 0) {
        console.log(`[DISPATCH]    Already declined by: [${excludeIds.join(', ')}]`);
      }
      return null;
    }

    // STEP 3: Log all candidates found
    console.log(`[DISPATCH] Found ${candidates.length} qualifying hospital(s):`);
    candidates.forEach((h, i) => {
      console.log(`[DISPATCH]   ${i+1}. ${h.name} — ${(h.distance_metres/1000).toFixed(2)}km — ${h.free_capacity} beds free`);
    });

    // STEP 4: Score every candidate
    const scored = candidates.map(h => ({
      ...h,
      score: this.scoreHospital(h)
    }));

    // STEP 5: Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // STEP 6: Pick top N (default 3) for bystander
    const top3 = scored.slice(0, this.topNForBystander).map(h => ({
      id:              h.id,
      name:            h.name,
      address:         h.address || null,
      phone:           h.phone || null,
      latitude:        Number(h.latitude),
      longitude:       Number(h.longitude),
      distance_km:     Number((h.distance_metres / 1000).toFixed(2)),
      free_capacity:   h.free_capacity,
      total_capacity:  h.total_capacity,
      score:           Number(h.score.toFixed(4))
    }));

    // STEP 7: The winner — same as top3[0] but with all internal fields
    const winner = scored[0];

    // STEP 8: Log the winner + top 3
    const distKm = (winner.distance_metres / 1000).toFixed(2);
    console.log(`\n[DISPATCH] ✅ Alert dispatched!`);
    console.log(`[DISPATCH]    → Hospital : ${winner.name}`);
    console.log(`[DISPATCH]    → Distance : ${distKm} km`);
    console.log(`[DISPATCH]    → Score    : ${winner.score.toFixed(4)}`);
    console.log(`[DISPATCH]    → Capacity : ${winner.free_capacity}/${winner.total_capacity} beds free`);
    console.log(`[DISPATCH]    → Room     : institution_room_${winner.id}`);

    if (top3.length > 1) {
      console.log(`[DISPATCH]    → Top 3 sent to bystander:`);
      top3.forEach((h, i) => {
        console.log(`[DISPATCH]       ${i+1}. ${h.name} (${h.distance_km}km)`);
      });
    }
    console.log('');

    // Attach top3 to winner so the controller can pass it back
    winner.top3 = top3;
    return winner;
  }

  // ────────────────────────────────────────────────────────────────────
  // getCandidates — find all hospitals matching requirements within radius
  // ────────────────────────────────────────────────────────────────────
  async getCandidates(lat, lng, requiredEquipment, requiredPersonnel, excludeIds = []) {

    const excludeClause = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})`
      : '';

    const pointWKT = `POINT(${lng} ${lat})`;

    const query = `
      SELECT *,
        ST_Distance_Sphere(
          location,
          ST_GeomFromText(?, 4326)
        ) AS distance_metres
      FROM institutions
      WHERE status       = 'approved'
        AND is_available = TRUE
        AND free_capacity > 0
        AND ST_Distance_Sphere(
              location,
              ST_GeomFromText(?, 4326)
            ) <= ?
        ${excludeClause}
      ORDER BY distance_metres ASC
    `;

    const params = [
      pointWKT,
      pointWKT,
      this.searchRadiusMetres,
      ...excludeIds
    ];

    const [rows] = await pool.execute(query, params);

    return rows.filter(hospital => {

      let equipment = [];
      let personnel = [];

      try {
        equipment = Array.isArray(hospital.equipment)
          ? hospital.equipment
          : JSON.parse(hospital.equipment || '[]');
      } catch { equipment = []; }

      try {
        personnel = Array.isArray(hospital.personnel)
          ? hospital.personnel
          : JSON.parse(hospital.personnel || '[]');
      } catch { personnel = []; }

      const hasEquipment = requiredEquipment.every(e => equipment.includes(e));
      const hasPersonnel = requiredPersonnel.some(p => personnel.includes(p));

      return hasEquipment && hasPersonnel;
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // scoreHospital — combines distance + capacity into a single score
  // Higher score = better candidate
  // ────────────────────────────────────────────────────────────────────
  scoreHospital(hospital) {
    const distanceKm = hospital.distance_metres / 1000;

    const distanceScore = distanceKm > 0 ? (1 / distanceKm) : 10;

    const capacityRatio = hospital.total_capacity > 0
      ? hospital.free_capacity / hospital.total_capacity
      : 0;

    return (distanceScore * this.distanceWeight) +
           (capacityRatio * this.capacityWeight);
  }
}

// Singleton — Node.js module cache enforces single instance
module.exports = new DispatchEngine();