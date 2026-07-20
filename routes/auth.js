const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const SALT_ROUNDS = 10;

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

router.post('/register', async (req, res) => {
  let client;
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: 'Harap isi nama lengkap, email, dan kata sandi terlebih dahulu.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Kata sandi harus memiliki setidaknya 6 karakter.'
      });
    }

    client = await pool.connect();

    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(400).json({ error: 'Pengguna dengan email ini sudah ada' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await client.query(
      'INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3) RETURNING id_user, full_name, email, role, created_at',
      [full_name, email, hashedPassword]
    );

    const newUser = result.rows[0];
    client.release();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id_user,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        created_at: formatDate(newUser.created_at)
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (client) client.release();
    res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

router.post('/login', async (req, res) => {
  let client;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Harap isi email dan kata sandi terlebih dahulu'
      });
    }

    client = await pool.connect();

    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      client.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      client.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    client.release();

    res.json({
      message: 'Login successful',
      user: {
        id: user.id_user,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (client) client.release();
    res.status(500).json({ error: 'Server error during login: ' + error.message });
  }
});

module.exports = router;