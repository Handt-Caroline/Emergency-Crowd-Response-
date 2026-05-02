const pool = require('../config/database');
const { getRequirements } = require('../utils/categoryMapper');

class DispatchEngine {

  constructor() {
    this.searchRadiusMetres = 10000; // 10km radius
    this.distanceWeight    = 0.6;
    this.capacityWeight    = 0.4;
  }

  // ── MAIN METHOD ──────────────────────────────────────────────────
  // Called with an alert object { latitude, longitude, situation }
  // excludeIds = hospitals already declined, skip them
  // Returns the single best hospital or null
  async findBestHospital(alert, excludeIds = []) {

    const requirements = getRequirements(alert.situation);

    // Step 1: Get all hospitals within 10km that have
    //         the right equipment AND the right personnel
    const candidates = await this.getCandidates(
      alert.latitude,
      alert.longitude,
      requirements.requiredEquipment,
      requirements.requiredPersonnel,
      excludeIds
    );

    // Step 2: If nobody qualifies → log and return null
    if (candidates.length === 0) {
      console.log(`[DISPATCH] ❌ No qualifying hospital found within ${this.searchRadiusMetres/1000}km for situation: ${alert.situation}`);
      console.log(`[DISPATCH]    Bystander GPS: lat=${alert.latitude}, lng=${alert.longitude}`);
      if (excludeIds.length > 0) {
        console.log(`[DISPATCH]    Already declined by: [${excludeIds.join(', ')}]`);
      }
      return null;
    }

    // Step 3: Log all candidates found
    console.log(`[DISPATCH] Found ${candidates.length} qualifying hospital(s):`);
    candidates.forEach((h, i) => {
      console.log(`[DISPATCH]   ${i+1}. ${h.name} — ${(h.distance_metres/1000).toFixed(2)}km — ${h.free_capacity} beds free`);
    });

    // Score every candidate
    // Distance = 60% of score, capacity = 40%
    const scored = candidates.map(h => ({
      ...h,
      score: this.scoreHospital(h)
    }));

    // Step 4: Sort by score highest first
    scored.sort((a, b) => b.score - a.score);

    // Step 5: Log the winner and return
    const winner = scored[0];
    const distKm = (winner.distance_metres / 1000).toFixed(2);
    console.log(`\n[DISPATCH] ✅ Alert dispatched!`);
    console.log(`[DISPATCH]    → Hospital : ${winner.name}`);
    console.log(`[DISPATCH]    → Distance : ${distKm} km`);
    console.log(`[DISPATCH]    → Score    : ${winner.score.toFixed(4)}`);
    console.log(`[DISPATCH]    → Capacity : ${winner.free_capacity}/${winner.total_capacity} beds free`);
    console.log(`[DISPATCH]    → Room     : institution_room_${winner.id}\n`);
    return winner;
  }

  // ── GET ALL QUALIFYING HOSPITALS ─────────────────────────────────
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

    // Filter in JavaScript by equipment and personnel
    // MySQL stores these as JSON strings — parse them safely
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

      // ALL required equipment must be present
      const hasEquipment = requiredEquipment.every(e => equipment.includes(e));

      // AT LEAST ONE required personnel must be present
      const hasPersonnel = requiredPersonnel.some(p => personnel.includes(p));

      return hasEquipment && hasPersonnel;
    });
  }

  // ── SCORE ONE HOSPITAL ───────────────────────────────────────────
  // Higher score = better candidate
  scoreHospital(hospital) {
    const distanceKm = hospital.distance_metres / 1000;

    // Closer = higher score (1/distance gives big number for close)
    const distanceScore = distanceKm > 0 ? (1 / distanceKm) : 10;

    // More free beds relative to total = higher score
    const capacityRatio = hospital.total_capacity > 0
      ? hospital.free_capacity / hospital.total_capacity
      : 0;

    return (distanceScore * this.distanceWeight) +
           (capacityRatio * this.capacityWeight);
  }
}

module.exports = new DispatchEngine();