

const express = require('express');
const router = express.Router();



// Admin middleware (for admin routes)
const { requireAdminAuth } = require('../middleware/adminAuthMiddleware');

// Institution middleware (for hospitals)
const { requireAuth } = require('../middleware/authMiddleware'); //  FIXED (lowercase)



// Test hospital authentication
router.get('/test-auth', requireAuth, (req, res) => {
  res.json({
    message: 'Access granted ',
    institution: req.institution
  });
});



// Test admin authentication
router.get('/dashboard', requireAdminAuth, (req, res) => {
  res.json({
    message: `Welcome ${req.admin.name} 👑`,
    admin: req.admin
  });
});

module.exports = router;