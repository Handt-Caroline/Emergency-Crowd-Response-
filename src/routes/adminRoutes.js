const express = require('express');
const router = express.Router();
// ■■ Controllers ■■
const { adminLogin } = require('../controllers/adminAuthController');
const {
getAllInstitutions,
approveHospital,
suspendHospital,
getStats,
getAllAlerts
} = require('../controllers/adminController');
// ■■ Middleware ■■
const { requireAdminAuth } = require('../middleware/adminAuthMiddleware');
// ■■ PUBLIC (no auth needed) ■■
router.post('/login', adminLogin);
// ■■ PROTECTED (admin JWT required) ■■
router.get('/dashboard', requireAdminAuth, (req, res) => {
res.json({ message: `Welcome ${req.admin.name}`, admin: req.admin });
});
router.get('/institutions', requireAdminAuth, getAllInstitutions);
router.get('/stats', requireAdminAuth, getStats);
router.patch('/institutions/:id/approve', requireAdminAuth, approveHospital);
router.patch('/institutions/:id/suspend', requireAdminAuth, suspendHospital);
router.get('/alerts', requireAdminAuth, getAllAlerts);
module.exports = router;