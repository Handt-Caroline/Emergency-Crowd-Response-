// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/database');

// ── Helper: validate email format on the server ──────────────────────
function isValidEmail(email) {
  if (!email || email.length > 254) return false;
  // Strict: lowercase local@domain.tld, no consecutive dots, TLD 2-63 chars
  const re = /^[a-z0-9]([a-z0-9._%+\-]*[a-z0-9])?@[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)*\.[a-z]{2,63}$/;
  if (!re.test(email)) return false;
  if (email.includes('..')) return false;
  const local = email.split('@')[0];
  if (local.length > 64) return false;
  return true;
}

// ── Helper: validate password strength on the server ─────────────────
function getPasswordErrors(password) {
  const errors = [];
  if (!password || password.length < 8)       errors.push('Password must be at least 8 characters.');
  if (!/[A-Z]/.test(password))                errors.push('Password must contain at least one uppercase letter.');
  if (!/[0-9]/.test(password))                errors.push('Password must contain at least one number.');
  return errors;
}

// ══════════════════════════════════════════════════════════════════
// POST /api/auth/register
// ══════════════════════════════════════════════════════════════════
async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      address,
      phone,
      latitude,
      longitude,
      equipment,
      personnel,
      totalCapacity
    } = req.body;

    // ── Required field check ──────────────────────────────────────
    if (!name || !email || !password || !latitude || !longitude) {
      return res.status(400).json({
        error:    'Missing required fields: name, email, password, latitude, longitude',
        error_fr: 'Champs obligatoires manquants: nom, email, mot de passe, latitude, longitude'
      });
    }

    // ── Name validation ───────────────────────────────────────────
    if (name.trim().length < 3) {
      return res.status(400).json({
        error:    'Hospital name must be at least 3 characters.',
        error_fr: 'Le nom de l\'hôpital doit avoir au moins 3 caractères.'
      });
    }

    // ── Email format validation ───────────────────────────────────
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        error:    'Invalid email format. Example: contact@hopital.cm — must contain @ and a valid domain.',
        error_fr: 'Format email invalide. Exemple: contact@hopital.cm — doit contenir @ et un domaine valide.'
      });
    }

    // ── Password strength validation ──────────────────────────────
    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length > 0) {
      return res.status(400).json({
        error:    pwErrors[0],
        error_fr: 'Mot de passe trop faible: ' + pwErrors[0]
      });
    }

    // ── GPS coordinate validation ─────────────────────────────────
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || lat < -90  || lat > 90)  {
      return res.status(400).json({ error: 'Latitude must be between -90 and 90.',   error_fr: 'Latitude invalide.' });
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Longitude must be between -180 and 180.', error_fr: 'Longitude invalide.' });
    }

    // ── Check if email already registered ────────────────────────
    const [existing] = await pool.execute(
      'SELECT id FROM institutions WHERE email = ?',
      [cleanEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        error:    'This email is already registered. Please use a different email or login.',
        error_fr: 'Cet email est déjà enregistré. Utilisez un autre email ou connectez-vous.'
      });
    }

    // ── Hash password ─────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 10);

    const capacity = parseInt(totalCapacity) || 0;

    // ── Insert into database ──────────────────────────────────────
    const [result] = await pool.execute(
      `INSERT INTO institutions
       (name, type, email, password_hash, address, phone,
        latitude, longitude, location,
        equipment, personnel,
        total_capacity, free_capacity,
        is_available, status)
       VALUES (?, 'hospital', ?, ?, ?, ?, ?, ?, ST_GeomFromText(?, 4326),
               ?, ?, ?, ?, true, 'pending')`,
      [
        name.trim(),
        cleanEmail,
        passwordHash,
        address  || null,
        phone    || null,
        lat,
        lng,
        `POINT(${lng} ${lat})`,
        JSON.stringify(equipment || []),
        JSON.stringify(personnel || []),
        capacity,
        capacity
      ]
    );

    return res.status(201).json({
      message:    'Registration received. Awaiting admin approval.',
      message_fr: 'Inscription reçue. En attente de validation par un administrateur.',
      institutionId: result.insertId
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      error:    'Server error. Please try again.',
      error_fr: 'Erreur serveur. Veuillez réessayer.'
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error:    'Email and password are required.',
        error_fr: 'Email et mot de passe sont requis.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic format check even at login (prevents DB lookup for obvious junk)
    if (!isValidEmail(cleanEmail)) {
      return res.status(401).json({
        error:    'Incorrect email or password.',
        error_fr: 'Email ou mot de passe incorrect.'
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM institutions WHERE email = ?',
      [cleanEmail]
    );

    // Use same generic message for both "not found" and "wrong password"
    // (security: don't reveal whether the email exists)
    if (rows.length === 0) {
      return res.status(401).json({
        error:    'Incorrect email or password.',
        error_fr: 'Email ou mot de passe incorrect.'
      });
    }

    const institution = rows[0];
    const passwordValid = await bcrypt.compare(password, institution.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error:    'Incorrect email or password.',
        error_fr: 'Email ou mot de passe incorrect.'
      });
    }

    if (institution.status === 'pending') {
      return res.status(403).json({
        error:    'Your account is awaiting admin approval. Please wait.',
        error_fr: 'Votre compte est en attente de validation par un administrateur.'
      });
    }

    if (institution.status === 'suspended') {
      return res.status(403).json({
        error:    'Your account has been suspended. Contact the ECRS admin.',
        error_fr: 'Votre compte a été suspendu. Contactez l\'administrateur ECRS.'
      });
    }

    const token = jwt.sign(
      {
        id:     institution.id,
        name:   institution.name,
        email:  institution.email,
        role:   'institution',
        status: institution.status,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      message:    'Login successful.',
      message_fr: 'Connexion réussie.',
      token,
      institution: {
        id:            institution.id,
        name:          institution.name,
        email:         institution.email,
        address:       institution.address,
        phone:         institution.phone,
        latitude:      institution.latitude,
        longitude:     institution.longitude,
        status:        institution.status,
        is_available:  institution.is_available,
        free_capacity: institution.free_capacity,
        total_capacity:institution.total_capacity,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error:    'Server error. Please try again.',
      error_fr: 'Erreur serveur. Veuillez réessayer.'
    });
  }
}

module.exports = { register, login };