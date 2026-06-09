// src/routes/alertsRoutes.js
const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');

const { requireAuth } = require('../middleware/authMiddleware');
const { createAlert, confirmAlert, declineAlert, resolveAlert } = require('../controllers/alertsController');


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
  limits:    { fileSize: 10 * 1024 * 1024 }, // 10 MB max (safety net; photos are compressed on phone)
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


function uploadPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      console.warn('[UPLOAD] Photo rejected:', err.message);
      // Multer "file too large"
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Photo too large. Please try a smaller image.',
          error_fr: 'Photo trop volumineuse. Essayez une image plus petite.'
        });
      }
      // Invalid file type or any other multer error
      return res.status(400).json({
        error: err.message || 'Photo upload failed',
        error_fr: "Échec du téléchargement de la photo"
      });
    }
    next();
  });
}

router.post('/', uploadPhoto, createAlert);

// Hospital only — JWT required
router.patch('/:id/confirm', requireAuth, confirmAlert);
router.patch('/:id/decline', requireAuth, declineAlert);
router.patch('/:id/resolve', requireAuth, resolveAlert);

module.exports = router;