const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { signToken, verifyToken, verifyRole } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const VALID_STAFF_ROLES = ['admin', 'penguji', 'pengasuh'];

const formatDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    return dateValue;
  }
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateValue;
};

router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Please provide email and password'
      });
    }

    if (!role) {
      return res.status(400).json({
        error: 'Please provide role (admin, penguji, or pengasuh)'
      });
    }

    if (!VALID_STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be admin, penguji, or pengasuh'
      });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, role]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({
      id: user.id_user,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id_user,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Private login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Hanya admin yang boleh membuat akun staff
router.post('/register', verifyToken, verifyRole(['admin']), async (req, res) => {
  let client;
  try {
    const { full_name, email, password, role } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        error: 'Harap isi nama lengkap, email, kata sandi, dan role terlebih dahulu.'
      });
    }

    if (!VALID_STAFF_ROLES.includes(role)) {
      return res.status(400).json({
        error: 'Role tidak valid. Harus admin, penguji, atau pengasuh.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Kata sandi harus memiliki setidaknya 6 karakter.'
      });
    }

    client = await pool.connect();

    const existingUser = await client.query(
      'SELECT id_user FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ error: 'Pengguna dengan email ini sudah ada' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      'INSERT INTO users (full_name, email, password, role, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id_user, full_name, email, role, created_at',
      [full_name, email, hashedPassword, role]
    );

    const newUser = result.rows[0];
    client.release();

    res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: newUser.id_user,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        created_at: formatDate(newUser.created_at)
      }
    });
  } catch (error) {
    console.error('Private register error:', error);
    if (client) client.release();
    res.status(500).json({ error: 'Server error during registration' });
  }
});

module.exports = router;
