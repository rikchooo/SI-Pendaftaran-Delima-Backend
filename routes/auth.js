const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { signToken } = require('../middleware/auth');

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

const ensureUsersTable = async (client) => {
  const checkTable = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  `);

  if (checkTable.rows.length === 0) {
    console.log('[Auth] users table not found, creating...');
    await client.query(`
      CREATE TABLE users (
        id_user SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Auth] users table created');
  }
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
    await ensureUsersTable(client);

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
    console.error('[Register] Error:', error);
    if (client) client.release();
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  let client;
  let clientReleased = false;

  const releaseClient = () => {
    if (client && !clientReleased) {
      clientReleased = true;
      client.release();
    }
  };

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Harap isi email dan kata sandi terlebih dahulu'
      });
    }

    client = await pool.connect();
    await ensureUsersTable(client);

    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Login publik hanya untuk role user (bukan staff)
    if (user.role && user.role !== 'user') {
      return res.status(403).json({
        error: 'Akun staff harus login melalui halaman private'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    releaseClient();

    const token = signToken({
      id: user.id_user,
      email: user.email,
      role: user.role || 'user',
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
    console.error('[Login] Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  } finally {
    releaseClient();
  }
});

module.exports = router;
