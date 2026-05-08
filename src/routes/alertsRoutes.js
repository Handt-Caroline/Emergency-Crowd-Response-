// src/routes/alertsRoutes.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');

const { requireAuth } = require('../middleware/authMiddleware');
const { createAlert, confirmAlert, declineAlert, resolveAlert } = require('../controllers/alertsController');

// ── Multer: save photos to /uploads/alerts/ ───────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/alerts');

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext      = path.extname(file.originalname) || '.jpg';
    const safeName = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits:    { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ── Routes ────────────────────────────────────────────────────────────

// Bystander — no auth needed
// upload.single('photo') handles multipart/form-data OR falls through for JSON
router.post('/', upload.single('photo'), createAlert);

// Hospital only — JWT required
router.patch('/:id/confirm', requireAuth, confirmAlert);
router.patch('/:id/decline', requireAuth, declineAlert);
router.patch('/:id/resolve', requireAuth, resolveAlert);

module.exports = router;