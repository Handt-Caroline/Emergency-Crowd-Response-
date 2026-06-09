
const jwt = require('jsonwebtoken');

// Middleware function
function requireAdminAuth(req, res, next) {

  
  // Expected format: "Authorization: Bearer TOKEN"
  const authHeader = req.headers.authorization;


  // Reject if header missing or incorrect format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:    'Access denied. Admin token required.',
      error_fr: 'Acces refuse. Token administrateur requis.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {


    // Decode token using secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

  
    // Only allow users with role = 'admin'
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error:    'Access denied. Admin accounts only.',
        error_fr: 'Acces refuse. Comptes administrateur uniquement.',
      });
    }


    req.admin = decoded;

    next();

  } catch (error) {

    
    // Token invalid, expired, or tampered
    return res.status(401).json({
      error:    'Invalid or expired admin token.',
      error_fr: 'Token administrateur invalide ou expire.',
    });

  }
}

// Export middleware
module.exports = { requireAdminAuth };