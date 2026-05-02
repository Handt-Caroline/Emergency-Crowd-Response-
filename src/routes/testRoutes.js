// ─────────────────────────────────────────────────────
// testRoutes.js — used to test authentication (institution + admin)
// ─────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

// ================= IMPORT MIDDLEWARE =================

// Admin middleware (for admin routes)
const { requireAdminAuth } = require('../middleware/adminAuthMiddleware');

// Institution middleware (for hospitals)
const { requireAuth } = require('../middleware/authMiddleware'); // ✅ FIXED (lowercase)

// ================= TEST INSTITUTION =================

// Test hospital authentication
router.get('/test-auth', requireAuth, (req, res) => {
  res.json({
    message: 'Access granted ✅',
    institution: req.institution
  });
});

// ================= TEST ADMIN =================

// Test admin authentication
router.get('/dashboard', requireAdminAuth, (req, res) => {
  res.json({
    message: `Welcome ${req.admin.name} 👑`,
    admin: req.admin
  });
});

module.exports = router;