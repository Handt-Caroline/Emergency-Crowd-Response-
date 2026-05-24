const pool = require('../config/database');

// ■■ GET /api/admin/institutions ■■
async function getAllInstitutions(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, type, email, address, phone, status, created_at
       FROM institutions
       ORDER BY created_at DESC`
    );
    res.json({ institutions: rows });
  } catch (error) {
    console.error('getAllInstitutions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ■■ PATCH /api/admin/institutions/:id/approve ■■
async function approveHospital(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, status FROM institutions WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'Hospital not found' });

    if (rows[0].status === 'approved')
      return res.status(400).json({ error: 'Hospital is already approved' });

    await pool.execute(
      "UPDATE institutions SET status = 'approved' WHERE id = ?",
      [req.params.id]
    );

    res.json({
      message: 'Hospital approved',
      hospital: { id: rows[0].id, name: rows[0].name, status: 'approved' }
    });

  } catch (error) {
    console.error('approveHospital error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ■■ PATCH /api/admin/institutions/:id/suspend ■■
async function suspendHospital(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, status FROM institutions WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: 'Hospital not found' });

    if (rows[0].status === 'suspended')
      return res.status(400).json({ error: 'Hospital is already suspended' });

    // 1. Update database status
    await pool.execute(
      "UPDATE institutions SET status = 'suspended', is_available = FALSE WHERE id = ?",
      [req.params.id]
    );

    // 2. Kick the hospital off its live socket room immediately
    //    so it stops receiving any in-flight or future alerts
    const io = req.app.get('io');
    if (io) {
      const roomName = `institution_room_${req.params.id}`;
      const room = io.sockets.adapter.rooms.get(roomName);

      if (room) {
        // Notify every socket in that room, then remove them
        io.to(roomName).emit('account:suspended', {
          message: 'Your account has been suspended by the administrator. You will no longer receive emergency alerts. Please contact ECRS support.',
          message_fr: 'Votre compte a été suspendu par l\'administrateur. Vous ne recevrez plus d\'alertes d\'urgence.'
        });

        // Force every socket out of the room
        for (const socketId of room) {
          const clientSocket = io.sockets.sockets.get(socketId);
          if (clientSocket) clientSocket.leave(roomName);
        }

        console.log(`[SUSPEND] Hospital ${req.params.id} kicked from ${roomName}`);
      }
    }

    res.json({
      message: 'Hospital suspended and disconnected from alert network',
      hospital: { id: rows[0].id, name: rows[0].name, status: 'suspended' }
    });

  } catch (error) {
    console.error('suspendHospital error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

// ■■ GET /api/admin/stats ■■
async function getStats(req, res) {
  try {
    const [[approved]]  = await pool.execute("SELECT COUNT(*) AS c FROM institutions WHERE status='approved'");
    const [[pending]]   = await pool.execute("SELECT COUNT(*) AS c FROM institutions WHERE status='pending'");
    const [[suspended]] = await pool.execute("SELECT COUNT(*) AS c FROM institutions WHERE status='suspended'");
    const [[today]]     = await pool.execute("SELECT COUNT(*) AS c FROM alerts WHERE DATE(created_at) = CURDATE()");
    const [[active]]    = await pool.execute("SELECT COUNT(*) AS c FROM alerts WHERE status NOT IN ('RESOLVED','FAILED')");

    res.json({
      approvedHospitals:  approved.c,
      pendingHospitals:   pending.c,
      suspendedHospitals: suspended.c,
      alertsToday:        today.c,
      activeAlerts:       active.c
    });

  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}


// ■■ GET /api/admin/alerts ■■
// Returns all alerts with: who confirmed, who declined, current status
async function getAllAlerts(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         a.id,
         a.emergency_type,
         a.situation,
         a.victims_count,
         a.status,
         a.created_at,
         a.resolved_at,
         -- Hospital that CONFIRMED
         conf_i.name          AS confirmed_by,
         asgn_conf.confirmed_at,
         -- All hospitals that DECLINED (comma-separated)
         GROUP_CONCAT(DISTINCT decl_i.name ORDER BY asgn_decl.declined_at SEPARATOR ', ')
                              AS declined_by
       FROM alerts a
       -- Join the confirmed assignment (if any)
       LEFT JOIN assignments asgn_conf
              ON asgn_conf.alert_id = a.id
             AND asgn_conf.confirmed_at IS NOT NULL
       LEFT JOIN institutions conf_i
              ON conf_i.id = asgn_conf.institution_id
       -- Join all declined assignments
       LEFT JOIN assignments asgn_decl
              ON asgn_decl.alert_id = a.id
             AND asgn_decl.declined_at IS NOT NULL
       LEFT JOIN institutions decl_i
              ON decl_i.id = asgn_decl.institution_id
       GROUP BY
         a.id, a.emergency_type, a.situation, a.victims_count,
         a.status, a.created_at, a.resolved_at,
         conf_i.name, asgn_conf.confirmed_at
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    res.json({ alerts: rows });
  } catch (error) {
    console.error('getAllAlerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getAllInstitutions, approveHospital, suspendHospital, getStats, getAllAlerts };