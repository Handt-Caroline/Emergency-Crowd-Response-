const pool = require('../config/database');
const { getRequirements } = require('../utils/categoryMapper');

// DispatchEngine — FULL DOCUMENT VERSION
class DispatchEngine {

  constructor() {
    this.searchRadiusMetres = 10000; // 10km
    this.distanceWeight = 0.6;
    this.capacityWeight = 0.4;
  }

  // ================= MAIN =================
  async findBestHospital(alert, excludeIds = []) {

    const requirements = getRequirements(alert.situation);

    const candidates = await this.getCandidates(
      alert.latitude,
      alert.longitude,
      requirements.requiredEquipment,
      requirements.requiredPersonnel,
      excludeIds
    );

    if (candidates.length === 0) {
      return null;
    }

    // Score hospitals
    const scored = candidates.map(h => ({
      ...h,
      score: this.scoreHospital(h)
    }));

    // Sort highest score first
    scored.sort((a, b) => b.score - a.score);

    return scored[0];
  }

  // ================= FILTERS =================
  async getCandidates(latitude, longitude, requiredEquipment, requiredPersonnel, excludeIds = []) {

    const excludeClause = excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})`
      : '';

    const query = `
      SELECT *,
        ST_Distance_Sphere(
          location,
          ST_GeomFromText(?, 4326)
        ) AS distance_metres
      FROM institutions
      WHERE status = 'approved'
        AND is_available = TRUE
        AND free_capacity > 0
        AND ST_Distance_Sphere(
          location,
          ST_GeomFromText(?, 4326)
        ) <= ?
        ${excludeClause}
      ORDER BY distance_metres ASC
    `;

    const pointWKT = `POINT(${longitude} ${latitude})`;

    const params = [
      pointWKT,
      pointWKT,
      this.searchRadiusMetres,
      ...excludeIds
    ];

    const [rows] = await pool.execute(query, params);

    // ✅ SAFE JSON HANDLING (THIS FIXES YOUR ERROR)
    return rows.filter(hospital => {

      let equipment = [];
      let personnel = [];

      try {
        equipment = Array.isArray(hospital.equipment)
          ? hospital.equipment
          : JSON.parse(hospital.equipment || '[]');
      } catch (e) {
        equipment = [];
      }

      try {
        personnel = Array.isArray(hospital.personnel)
          ? hospital.personnel
          : JSON.parse(hospital.personnel || '[]');
      } catch (e) {
        personnel = [];
      }

      const hasEquipment = requiredEquipment.every(e => equipment.includes(e));
      const hasPersonnel = requiredPersonnel.some(p => personnel.includes(p));

      return hasEquipment && hasPersonnel;
    });
  }

  // ================= SCORING =================
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

// Singleton export
module.exports = new DispatchEngine();