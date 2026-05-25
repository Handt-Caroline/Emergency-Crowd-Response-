require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');

// ── CREATE APP FIRST ──────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PATCH','PUT','DELETE'] }
});

// ── MIDDLEWARE ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SERVE UPLOADED PHOTOS ─────────────────────────────────────────
// Photos saved to /uploads folder are accessible at /uploads/filename
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',         require('./src/routes/authRoutes'));
app.use('/api/admin',        require('./src/routes/adminRoutes'));
app.use('/api/alerts',       require('./src/routes/alertsRoutes'));
app.use('/api/institutions', require('./src/routes/institutionRoutes'));  // ← WAS MISSING
//app.use('/api',              require('./src/routes/testRoutes'));

// ── API DOCUMENTATION (Swagger / OpenAPI) ─────────────────────────
// Interactive API docs available at /api-docs
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'ECRS API Documentation'
}));


// ── SERVE FRONTEND PAGES ──────────────────────────────────────────
app.use('/bystander', express.static(path.join(__dirname, 'bystander-app')));
app.use('/hospital',  express.static(path.join(__dirname, 'hospital-dashboard')));
app.use('/admin',     express.static(path.join(__dirname, 'admin-dashboard')));
app.use('/about',     express.static(path.join(__dirname, 'about-us')));
// ── ROOT TEST ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'ECRS server is running', status: 'ok', version: '1.0.0' });
});

// ── WEBSOCKET ─────────────────────────────────────────────────────
const pool = require('./src/config/database');
const jwt  = require('jsonwebtoken');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Hospital joins their institution room
  // Guard: re-check live DB status so suspended hospitals are blocked
  // even if they still hold a valid JWT token
  socket.on('join_room', async (institutionId) => {
    if (!institutionId) return;

    try {
      const [rows] = await pool.execute(
        'SELECT id, status FROM institutions WHERE id = ?',
        [institutionId]
      );

      if (rows.length === 0) {
        console.warn(`join_room rejected: institution ${institutionId} not found`);
        socket.emit('account:suspended', {
          message: 'Hospital not found.'
        });
        return;
      }

      if (rows[0].status !== 'approved') {
        console.warn(`join_room blocked: institution ${institutionId} is ${rows[0].status}`);
        // Tell the dashboard to log out and show a message
        socket.emit('account:suspended', {
          message: rows[0].status === 'suspended'
            ? 'Your account has been suspended by the administrator. You will no longer receive alerts.'
            : 'Your account is not approved yet.'
        });
        return;
      }

      socket.join(`institution_room_${institutionId}`);
      console.log(`[ROOM] Hospital ${institutionId} joined institution_room_${institutionId}`);

      // ── Replay any DISPATCHED alert this hospital missed ──────────
      // This handles the case where the alert fires before the
      // dashboard tab is open (common when testing on one laptop).
      // We look for a DISPATCHED assignment for this institution,
      // fetch the full alert data, and re-emit emergency:new
      // directly to this socket only (not the whole room).
      try {
        const { getSuggestedPrep } = require('./src/utils/categoryMapper');

        const [pending] = await pool.execute(
          `SELECT a.id AS alertId,
                  a.emergency_type, a.situation, a.medical_category,
                  a.victims_count, a.photo_url,
                  a.latitude, a.longitude,
                  a.bystander_name, a.bystander_phone,
                  i.latitude  AS hosp_lat,
                  i.longitude AS hosp_lng
           FROM assignments asgn
           JOIN alerts       a ON a.id  = asgn.alert_id
           JOIN institutions i ON i.id  = asgn.institution_id
           WHERE asgn.institution_id = ?
             AND a.status = 'DISPATCHED'
             AND asgn.confirmed_at IS NULL
             AND asgn.declined_at  IS NULL
           ORDER BY a.created_at DESC
           LIMIT 1`,
          [institutionId]
        );

        if (pending.length > 0) {
          const p = pending[0];

          // Calculate distance
          const toRad = d => d * Math.PI / 180;
          const R = 6371000;
          const dLat = toRad(p.hosp_lat - p.latitude);
          const dLng = toRad(p.hosp_lng - p.longitude);
          const a2 = Math.sin(dLat/2)**2 +
                    Math.cos(toRad(p.latitude)) * Math.cos(toRad(p.hosp_lat)) *
                    Math.sin(dLng/2)**2;
          const distMetres = Math.round(R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1-a2)));

          const payload = {
            alertId:          p.alertId,
            emergency_type:   p.emergency_type,
            situation:        p.situation,
            medical_category: p.medical_category,
            victims_count:    p.victims_count,
            bystander_name:   p.bystander_name,
            bystander_phone:  p.bystander_phone,
            photo_url:        p.photo_url,
            latitude:         p.latitude,
            longitude:        p.longitude,
            distance_metres:  distMetres,
            suggestedPrepFr:  getSuggestedPrep(p.situation, 'fr'),
            suggestedPrepEn:  getSuggestedPrep(p.situation, 'en'),
            replayed:         true   // flag so you can see it in dashboard logs
          };

          // Send ONLY to this socket — not broadcast to whole room
          socket.emit('emergency:new', payload);
          console.log(`[REPLAY] ⚡ Replayed alert #${p.alertId} to hospital ${institutionId} (they missed it)`);
        }
      } catch (replayErr) {
        console.error('[REPLAY] Error fetching pending alert:', replayErr.message);
      }
    } catch (err) {
      console.error('join_room DB error:', err);
    }
  });

  // Bystander joins their alert room after POST /api/alerts
  socket.on('join_alert_room', (alertId) => {
    if (!alertId) return;
    socket.join(`alert_room_${alertId}`);
    console.log(`Bystander joined alert_room_${alertId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// ── START SERVER ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ECRS server running on port ${PORT}`);
});