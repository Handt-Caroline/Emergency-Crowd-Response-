const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { requireAuth } = require('../middleware/authMiddleware');

// ══════════════════════════════════════════════════════════════════
// PATCH /api/institutions/me/capacity
// Update availability and free bed count
// ══════════════════════════════════════════════════════════════════
router.patch('/me/capacity', requireAuth, async (req, res) => {
  try {
    const { free_capacity } = req.body;
    // Note: is_available is NOT touched here — hospitals are always operational.
    // Availability is only changed by the admin (approve/suspend).
    await pool.execute(
      'UPDATE institutions SET free_capacity = ? WHERE id = ?',
      [free_capacity, req.institution.id]
    );
    res.json({ message: 'Capacity updated successfully.' });
  } catch (err) {
    console.error('capacity update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════
// PATCH /api/institutions/me/profile
// Update name, phone, address, total_capacity, equipment, personnel
// This is what the hospital uses to keep their profile accurate so
// the Dispatch Engine routes the right emergencies to them.
// ══════════════════════════════════════════════════════════════════
router.patch('/me/profile', requireAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      total_capacity,
      free_capacity,
      equipment,   // array e.g. ['DEFIBRILLATOR','OXYGEN']
      personnel    // array e.g. ['CARDIOLOGIST','GENERAL_DOCTOR']
    } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Hospital name is required.' });
    }

    if (total_capacity !== undefined && total_capacity < 0) {
      return res.status(400).json({ error: 'Total capacity cannot be negative.' });
    }

    // Validate free_capacity does not exceed total
    if (
      free_capacity !== undefined &&
      total_capacity !== undefined &&
      free_capacity > total_capacity
    ) {
      return res.status(400).json({
        error: 'Free beds cannot exceed total capacity.'
      });
    }

    // Safely stringify arrays for MySQL JSON columns
    const equipmentJson = JSON.stringify(
      Array.isArray(equipment) ? equipment : []
    );
    const personnelJson = JSON.stringify(
      Array.isArray(personnel) ? personnel : []
    );

    await pool.execute(
      `UPDATE institutions
       SET
         name           = ?,
         phone          = ?,
         address        = ?,
         total_capacity = ?,
         free_capacity  = ?,
         equipment      = ?,
         personnel      = ?
       WHERE id = ?`,
      [
        name.trim(),
        phone   || null,
        address || null,
        total_capacity  ?? 0,
        free_capacity   ?? 0,
        equipmentJson,
        personnelJson,
        req.institution.id
      ]
    );

    // Return the updated profile so the dashboard can refresh
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, address,
              total_capacity, free_capacity,
              equipment, personnel, is_available, status
       FROM institutions WHERE id = ?`,
      [req.institution.id]
    );

    const updated = rows[0];

    // Parse JSON fields before sending
    try { updated.equipment = JSON.parse(updated.equipment || '[]'); } catch { updated.equipment = []; }
    try { updated.personnel = JSON.parse(updated.personnel || '[]'); } catch { updated.personnel = []; }

    console.log(`[PROFILE] ✏️  Hospital #${req.institution.id} (${updated.name}) updated their profile`);

    res.json({
      message:     'Profile updated successfully.',
      institution: updated
    });

  } catch (err) {
    console.error('profile update error:', err);
    res.status(500).json({ error: 'Server error while updating profile.' });
  }
});

// ══════════════════════════════════════════════════════════════════
// GET /api/institutions/me/cases
// Returns last 15 alerts this hospital was involved in
// ══════════════════════════════════════════════════════════════════
router.get('/me/cases', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         a.id            AS alertId,
         a.situation,
         a.emergency_type,
         a.victims_count,
         a.status        AS alert_status,
         asgn.confirmed_at,
         asgn.declined_at,
         ec.outcome,
         ec.closed_at,
         COALESCE(ec.closed_at, asgn.confirmed_at, asgn.declined_at, a.created_at)
                         AS activity_time
       FROM assignments asgn
       JOIN alerts a ON a.id = asgn.alert_id
       LEFT JOIN emergency_cases ec
              ON ec.alert_id       = asgn.alert_id
             AND ec.institution_id = asgn.institution_id
       WHERE asgn.institution_id = ?
       ORDER BY activity_time DESC
       LIMIT 15`,
      [req.institution.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('me/cases error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;