// ─────────────────────────────────────────────────────
// adminAuthMiddleware.js — Protect admin-only routes
// This middleware ensures ONLY admins can access admin endpoints
// ─────────────────────────────────────────────────────

// Import JWT library for token verification
const jwt = require('jsonwebtoken');

// Middleware function
function requireAdminAuth(req, res, next) {

  // ================= GET AUTH HEADER =================
  // Expected format: "Authorization: Bearer TOKEN"
  const authHeader = req.headers.authorization;

  // ================= CHECK HEADER =================
  // Reject if header missing or incorrect format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:    'Access denied. Admin token required.',
      error_fr: 'Acces refuse. Token administrateur requis.',
    });
  }

  // ================= EXTRACT TOKEN =================
  const token = authHeader.split(' ')[1];

  try {

    // ================= VERIFY TOKEN =================
    // Decode token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ================= CHECK ROLE =================
    // Only allow users with role = 'admin'
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error:    'Access denied. Admin accounts only.',
        error_fr: 'Acces refuse. Comptes administrateur uniquement.',
      });
    }

    // ================= ATTACH ADMIN DATA =================
    // Make admin info available in controllers
    req.admin = decoded;

    // ================= CONTINUE =================
    next();

  } catch (error) {

    // ================= TOKEN ERROR =================
    // Token invalid, expired, or tampered
    return res.status(401).json({
      error:    'Invalid or expired admin token.',
      error_fr: 'Token administrateur invalide ou expire.',
    });

  }
}

// Export middleware
module.exports = { requireAdminAuth };