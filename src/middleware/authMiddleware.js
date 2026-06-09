const jwt  = require('jsonwebtoken');
const pool = require('../config/database');


async function requireAuth(req, res, next) {


  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error:    'Access denied. No token provided.',
      error_fr: 'Acces refuse. Aucun token fourni.'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!process.env.JWT_SECRET) {
    console.error('[AUTH] JWT_SECRET is missing in .env');
    return res.status(500).json({ error: 'Server configuration error' });
  }

 
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error('[AUTH] JWT verify failed:', error.message);
    return res.status(401).json({
      error:    'Invalid or expired token. Please login again.',
      error_fr: 'Token invalide ou expire. Veuillez vous reconnecter.'
    });
  }


  if (decoded.role !== 'institution') {
    return res.status(403).json({
      error:    'Access denied. Hospital accounts only.',
      error_fr: 'Acces refuse. Comptes hopital uniquement.'
    });
  }


  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, status FROM institutions WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        error:    'Hospital account not found.',
        error_fr: 'Compte hopital introuvable.'
      });
    }

    const institution = rows[0];

    if (institution.status === 'suspended') {
      return res.status(403).json({
        error:     'Your account has been suspended. Contact the ECRS administrator.',
        error_fr:  'Votre compte a ete suspendu. Contactez l\'administrateur ECRS.',
        suspended: true
      });
    }

    if (institution.status !== 'approved') {
      return res.status(403).json({
        error:    'Your account is not approved yet.',
        error_fr: 'Votre compte n\'est pas encore approuve.'
      });
    }

 
    req.institution = {
      id:    institution.id,
      name:  institution.name,
      email: institution.email
    };

    next();

  } catch (dbError) {
    console.error('[AUTH] DB error during status check:', dbError);
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
}

module.exports = { requireAuth };