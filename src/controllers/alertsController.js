const pool = require('../config/database');
const DispatchEngine = require('../services/DispatchEngine');

// ================= CREATE ALERT =================
// POST /api/alerts

async function createAlert(req, res) {
  try {

    const {
      device_id,
      bystander_name,
      bystander_phone,
      emergency_type,
      situation,
      medical_category,
      victims_count,
      latitude,
      longitude
    } = req.body;

    // ================= VALIDATION =================
    if (!device_id || !emergency_type || !situation || !latitude || !longitude) {
      return res.status(400).json({
        error: 'Missing required fields',
        error_fr: 'Champs obligatoires manquants'
      });
    }

    // ================= SAVE ALERT =================
    const [result] = await pool.execute(
      `INSERT INTO alerts
      (device_id, bystander_name, bystander_phone,
       emergency_type, situation, medical_category,
       victims_count, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        device_id,
        bystander_name || null,
        bystander_phone || null,
        emergency_type,
        situation,
        medical_category || 'GENERAL',
        victims_count || 'UNKNOWN',
        latitude,
        longitude
      ]
    );

    const alertId = result.insertId;

    // ================= FETCH ALERT =================
    const [rows] = await pool.execute(
      'SELECT * FROM alerts WHERE id = ?',
      [alertId]
    );

    const alert = rows[0];

    // ================= DISPATCH =================
    const hospital = await DispatchEngine.findBestHospital(alert);

    // ❌ NO HOSPITAL FOUND
    if (!hospital) {
      return res.status(201).json({
        message: 'Alert created but no hospital available',
        alertId
      });
    }

    // ================= SAVE ASSIGNMENT =================
    await pool.execute(
      `INSERT INTO assignments (alert_id, institution_id)
       VALUES (?, ?)`,
      [alertId, hospital.id]
    );

    // ================= UPDATE ALERT STATUS =================
    await pool.execute(
      `UPDATE alerts SET status = 'DISPATCHED' WHERE id = ?`,
      [alertId]
    );

    // ================= REAL-TIME NOTIFICATION =================
    const io = req.app.get('io');

    io.to(`institution_room_${hospital.id}`).emit('new_alert', {
      alert,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address
      }
    });

    // ✅ FINAL RESPONSE (FIXED)
    return res.status(201).json({
      message: 'Alert created and dispatched',
      alertId,
      hospital: {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        free_capacity: hospital.free_capacity
      }
    });

  } catch (error) {
    console.error('Create alert error:', error);

    return res.status(500).json({
      error: 'Server error',
      error_fr: 'Erreur serveur'
    });
  }
}

module.exports = { createAlert };