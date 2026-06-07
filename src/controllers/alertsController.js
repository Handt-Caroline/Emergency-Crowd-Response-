const pool           = require('../config/database');
const DispatchEngine = require('../services/DispatchEngine');
const {
  getRequirements,
  getCombinedRequirements,
  getOtherWithKeywords,
  getSuggestedPrep
} = require('../utils/categoryMapper');

// ══════════════════════════════════════════════════════════════════
// POST /api/alerts
// ══════════════════════════════════════════════════════════════════
async function createAlert(req, res) {
  try {
    const {
      device_id,
      bystander_name,
      bystander_phone,
      emergency_type,
      situation,
      victims_count,
      latitude,
      longitude
    } = req.body;

    if (!device_id || !emergency_type || !situation || !latitude || !longitude) {
      return res.status(400).json({
        error:    'Missing required fields: device_id, emergency_type, situation, latitude, longitude',
        error_fr: 'Champs obligatoires manquants'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/alerts/${req.file.filename}`;
    }

    let requirements;
    if (situation && situation.startsWith('OTHER:')) {
      const description = situation.substring(6).trim();
      requirements = getOtherWithKeywords(description);
    } else if (situation && situation.includes(',')) {
      const symptomList = situation.split(',').map(s => s.trim()).filter(Boolean);
      requirements = getCombinedRequirements(symptomList);
    } else {
      requirements = getRequirements(situation);
    }
    const medicalCategory = requirements.medicalCategory;

    const [result] = await pool.execute(
      `INSERT INTO alerts
       (device_id, bystander_name, bystander_phone,
        emergency_type, situation, medical_category,
        victims_count, photo_url, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        device_id,
        bystander_name  || null,
        bystander_phone || null,
        emergency_type,
        situation,
        medicalCategory,
        victims_count || 'UNKNOWN',
        photoUrl,
        lat,
        lng
      ]
    );

    const alertId = result.insertId;

    console.log(`\n[ALERT] 🚨 New alert #${alertId} received`);
    console.log(`[ALERT]    Type      : ${emergency_type}`);
    console.log(`[ALERT]    Situation : ${situation}`);
    console.log(`[ALERT]    Victims   : ${victims_count || 'UNKNOWN'}`);
    console.log(`[ALERT]    GPS       : lat=${lat}, lng=${lng}`);
    if (bystander_name)  console.log(`[ALERT]    Bystander : ${bystander_name}`);
    if (bystander_phone) console.log(`[ALERT]    Phone     : ${bystander_phone}`);
    if (photoUrl)        console.log(`[ALERT]    Photo     : ${photoUrl}`);
    console.log(`[ALERT]    Running dispatch engine...\n`);

    const hospital = await DispatchEngine.findBestHospital(
      { latitude: lat, longitude: lng, situation }
    );

    const io = req.app.get('io');

    if (!hospital) {
      console.log(`[ALERT] ❌ Alert #${alertId} — no hospital available.`);
      await pool.execute(
        "UPDATE alerts SET status = 'FAILED' WHERE id = ?",
        [alertId]
      );
      io.to(`alert_room_${alertId}`).emit('alert:failed', {
        message:    'No hospital available near you. Call emergency services.',
        message_fr: 'Aucun hôpital disponible. Appelez les secours.',
        emergency_numbers: [
          { name: 'SAMU',        number: '15'  },
          { name: 'Croix-Rouge', number: '117' },
          { name: 'Police',      number: '17'  }
        ]
      });
      return res.status(201).json({ alertId, dispatched: false });
    }

    // ── Hospital found — save assignment ──
    await pool.execute(
      'INSERT INTO assignments (alert_id, institution_id) VALUES (?, ?)',
      [alertId, hospital.id]
    );

    // ── BUG FIX: was "institutionId" (undefined). Correct variable is hospital.id ──
    await pool.execute(
      `UPDATE institutions
       SET free_capacity = free_capacity - 1
       WHERE id = ? AND free_capacity > 0`,
      [hospital.id]
    );

    await pool.execute(
      "UPDATE alerts SET status = 'DISPATCHED' WHERE id = ?",
      [alertId]
    );

    const suggestedPrepFr = getSuggestedPrep(situation, 'fr');
    const suggestedPrepEn = getSuggestedPrep(situation, 'en');

    if (Array.isArray(hospital.top3) && hospital.top3.length > 0) {
      console.log(`[ALERT] 📋 Sending top ${hospital.top3.length} hospitals to bystander`);
      io.to(`alert_room_${alertId}`).emit('alert:dispatched', {
        alertId,
        primary: {
          id:          hospital.id,
          name:        hospital.name,
          distance_km: Number((hospital.distance_metres / 1000).toFixed(2)),
          phone:       hospital.phone || null,
          latitude:    Number(hospital.latitude),
          longitude:   Number(hospital.longitude)
        },
        backups: hospital.top3.slice(1),
        topAll:  hospital.top3
      });
    }

    console.log(`[ALERT] 📡 Emitting emergency:new to institution_room_${hospital.id} (${hospital.name})`);
    io.to(`institution_room_${hospital.id}`).emit('emergency:new', {
      alertId,
      emergency_type,
      situation,
      medical_category:  medicalCategory,
      victims_count:     victims_count || 'UNKNOWN',
      bystander_name:    bystander_name  || null,
      bystander_phone:   bystander_phone || null,
      photo_url:         photoUrl,
      latitude:          lat,
      longitude:         lng,
      distance_metres:   Math.round(hospital.distance_metres),
      suggestedPrepFr,
      suggestedPrepEn
    });

    // ── Auto-timeout: 60 seconds ──
    setTimeout(async () => {
      try {
        const [check] = await pool.execute(
          "SELECT status FROM alerts WHERE id = ? AND status = 'DISPATCHED'",
          [alertId]
        );

        if (check.length > 0) {
          console.log(`[TIMEOUT] ⏰ Alert #${alertId} — hospital ${hospital.id} did not respond in 60s. Re-dispatching...`);

          await pool.execute(
            `UPDATE assignments
             SET declined_at = NOW()
             WHERE alert_id = ? AND institution_id = ? AND declined_at IS NULL AND confirmed_at IS NULL`,
            [alertId, hospital.id]
          );

          const nextHospital = await DispatchEngine.findBestHospital(
            { latitude: lat, longitude: lng, situation },
            [hospital.id]
          );

          if (!nextHospital) {
            console.log(`[TIMEOUT] ❌ Alert #${alertId} — no other hospital after timeout.`);
            await pool.execute(
              "UPDATE alerts SET status = 'FAILED' WHERE id = ?",
              [alertId]
            );
            io.to(`alert_room_${alertId}`).emit('alert:failed', {
              message:    'No hospital responded. Please call emergency services immediately.',
              message_fr: "Aucun hôpital n'a répondu. Appelez les secours immédiatement.",
              emergency_numbers: [
                { name: 'SAMU',        number: '15'  },
                { name: 'Croix-Rouge', number: '117' },
                { name: 'Police',      number: '17'  }
              ]
            });
            return;
          }

          await pool.execute(
            'INSERT INTO assignments (alert_id, institution_id) VALUES (?, ?)',
            [alertId, nextHospital.id]
          );

          io.to(`alert_room_${alertId}`).emit('alert:reassigned', {
            message:    'Contacting next hospital...',
            message_fr: 'Contacte le prochain hôpital...'
          });

          io.to(`institution_room_${nextHospital.id}`).emit('emergency:new', {
            alertId,
            emergency_type,
            situation,
            medical_category:  medicalCategory,
            victims_count:     victims_count || 'UNKNOWN',
            bystander_name:    bystander_name  || null,
            bystander_phone:   bystander_phone || null,
            photo_url:         photoUrl,
            latitude:          lat,
            longitude:         lng,
            distance_metres:   Math.round(nextHospital.distance_metres),
            suggestedPrepFr,
            suggestedPrepEn
          });

          console.log(`[TIMEOUT] ✅ Alert #${alertId} re-dispatched to ${nextHospital.name}`);
        }
      } catch (timeoutErr) {
        console.error('[TIMEOUT] Error during auto re-dispatch:', timeoutErr.message);
      }
    }, 60000);

    return res.status(201).json({ alertId, dispatched: true });

  } catch (error) {
    console.error('createAlert error:', error);
    return res.status(500).json({ error: 'Server error', error_fr: 'Erreur serveur' });
  }
}

// ══════════════════════════════════════════════════════════════════
// PATCH /api/alerts/:id/confirm
// ══════════════════════════════════════════════════════════════════
async function confirmAlert(req, res) {
  try {
    const alertId       = req.params.id;
    const institutionId = req.institution.id;

    await pool.execute(
      `UPDATE assignments
       SET confirmed_at = NOW()
       WHERE alert_id = ? AND institution_id = ? AND confirmed_at IS NULL`,
      [alertId, institutionId]
    );

    const [hospRows] = await pool.execute(
      'SELECT id, name, address, phone, latitude, longitude FROM institutions WHERE id = ?',
      [institutionId]
    );
    if (hospRows.length === 0) return res.status(404).json({ error: 'Hospital not found' });
    const hosp = hospRows[0];

    const [alertRows] = await pool.execute(
      'SELECT latitude, longitude FROM alerts WHERE id = ?',
      [alertId]
    );
    if (alertRows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    const alert = alertRows[0];

    const [distRows] = await pool.execute(
      `SELECT ROUND(
         ST_Distance_Sphere(
           ST_GeomFromText(?, 4326),
           ST_GeomFromText(?, 4326)
         ) / 1000, 1
       ) AS dist_km`,
      [
        `POINT(${hosp.longitude} ${hosp.latitude})`,
        `POINT(${alert.longitude} ${alert.latitude})`
      ]
    );
    const distKm = distRows[0].dist_km;

    const guidance = {
      hospital_id:      hosp.id,
      hospital_name:    hosp.name,
      hospital_address: hosp.address,
      hospital_phone:   hosp.phone,
      hospital_lat:     hosp.latitude,
      hospital_lng:     hosp.longitude,
      distance_km:      distKm,
      message:          `Go to ${hosp.name} now. Nearest hospital — ${distKm}km away.`,
      message_fr:       `Allez à ${hosp.name} maintenant. ${distKm}km. Ils ont été notifiés.`
    };

    const io = req.app.get('io');
    console.log(`\n[CONFIRM] ✅ Alert #${alertId} confirmed by ${hosp.name} (${distKm}km)\n`);
    io.to(`alert_room_${alertId}`).emit('alert:confirmed', guidance);

    await pool.execute(
      "UPDATE alerts SET status = 'CONFIRMED' WHERE id = ?",
      [alertId]
    );

    return res.json({ message: 'Confirmed. Guidance sent to bystander.' });

  } catch (error) {
    console.error('confirmAlert error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ══════════════════════════════════════════════════════════════════
// PATCH /api/alerts/:id/decline
// ══════════════════════════════════════════════════════════════════
async function declineAlert(req, res) {
  try {
    const alertId       = req.params.id;
    const institutionId = req.institution.id;

    await pool.execute(
      `UPDATE assignments
       SET declined_at = NOW()
       WHERE alert_id = ? AND institution_id = ? AND declined_at IS NULL`,
      [alertId, institutionId]
    );

    const [declined] = await pool.execute(
      'SELECT institution_id FROM assignments WHERE alert_id = ? AND declined_at IS NOT NULL',
      [alertId]
    );
    const excludeIds = declined.map(r => r.institution_id);

    const [alertRows] = await pool.execute(
      'SELECT latitude, longitude, situation FROM alerts WHERE id = ?',
      [alertId]
    );
    const alert = alertRows[0];

    console.log(`\n[DECLINE] ⚠️  Alert #${alertId} declined by institution #${institutionId}. Searching next...`);
    const nextHospital = await DispatchEngine.findBestHospital(alert, excludeIds);

    const io = req.app.get('io');

    if (!nextHospital) {
      await pool.execute(
        "UPDATE alerts SET status = 'FAILED' WHERE id = ?",
        [alertId]
      );
      io.to(`alert_room_${alertId}`).emit('alert:failed', {
        message:    'No hospital available near you. Call emergency services.',
        message_fr: 'Aucun hôpital disponible. Appelez les secours.',
        emergency_numbers: [
          { name: 'SAMU',        number: '15'  },
          { name: 'Croix-Rouge', number: '117' }
        ]
      });
      return res.json({ message: 'Declined. No other hospital available.' });
    }

    await pool.execute(
      'INSERT INTO assignments (alert_id, institution_id) VALUES (?, ?)',
      [alertId, nextHospital.id]
    );

    const suggestedPrepFr = getSuggestedPrep(alert.situation, 'fr');
    const suggestedPrepEn = getSuggestedPrep(alert.situation, 'en');

    io.to(`institution_room_${nextHospital.id}`).emit('emergency:new', {
      alertId,
      situation:       alert.situation,
      latitude:        alert.latitude,
      longitude:       alert.longitude,
      distance_metres: Math.round(nextHospital.distance_metres),
      suggestedPrepFr,
      suggestedPrepEn
    });

    io.to(`alert_room_${alertId}`).emit('alert:reassigned', {
      message:    'Contacting next hospital...',
      message_fr: 'Contacte le prochain hôpital...'
    });

    return res.json({ message: 'Declined. Next hospital alerted.' });

  } catch (error) {
    console.error('declineAlert error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

// ══════════════════════════════════════════════════════════════════
// PATCH /api/alerts/:id/resolve
// ══════════════════════════════════════════════════════════════════
async function resolveAlert(req, res) {
  try {
    const alertId       = req.params.id;
    const institutionId = req.institution.id;
    const { outcome, notes } = req.body;

    if (!outcome) {
      return res.status(400).json({
        error: 'outcome is required: TREATED, FALSE_ALARM, DECEASED, or TRANSFERRED'
      });
    }

    await pool.execute(
      'INSERT INTO emergency_cases (alert_id, institution_id, outcome, notes) VALUES (?, ?, ?, ?)',
      [alertId, institutionId, outcome, notes || null]
    );

    await pool.execute(
      "UPDATE alerts SET status = 'RESOLVED', resolved_at = NOW() WHERE id = ?",
      [alertId]
    );

    await pool.execute(
      `UPDATE institutions
       SET free_capacity = free_capacity + 1
       WHERE id = ? AND free_capacity < total_capacity`,
      [institutionId]
    );

    return res.json({ message: 'Case resolved. Capacity freed.' });

  } catch (error) {
    console.error('resolveAlert error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { createAlert, confirmAlert, declineAlert, resolveAlert };
