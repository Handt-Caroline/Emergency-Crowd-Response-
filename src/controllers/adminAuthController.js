// ─────────────────────────────────────────────────────
// adminAuthController.js — Admin login with personalization
// Each admin gets a personalized welcome message
// ─────────────────────────────────────────────────────

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// POST /api/admin/login
async function adminLogin(req, res) {
  try {

    // ================= GET DATA FROM BODY =================
    const { email, password } = req.body;

    // ================= VALIDATION =================
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required.',
        error_fr: 'Email et mot de passe requis.',
      });
    }

    // ================= FIND ADMIN =================
    const [rows] = await pool.execute(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Incorrect email or password.',
        error_fr: 'Email ou mot de passe incorrect.',
      });
    }

    const admin = rows[0];

    // ================= CHECK PASSWORD =================
    const isValid = await bcrypt.compare(password, admin.password_hash);

    if (!isValid) {
      return res.status(401).json({
        error: 'Incorrect email or password.',
        error_fr: 'Email ou mot de passe incorrect.',
      });
    }

    // ================= CREATE TOKEN =================
    const token = jwt.sign(
      {
        id: admin.id,
        name: admin.name,   // 👈 IMPORTANT (for personalization)
        email: admin.email,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // ================= PERSONALIZED RESPONSE =================
    res.status(200).json({
      message: `Welcome ${admin.name} 👋`,
      message_fr: `Bienvenue ${admin.name} 👋`,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);

    res.status(500).json({
      error: 'Server error',
      error_fr: 'Erreur serveur'
    });
  }
}

module.exports = { adminLogin };