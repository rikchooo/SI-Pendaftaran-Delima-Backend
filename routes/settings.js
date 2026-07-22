const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value, updated_at FROM settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[Settings] Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/:key', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
       RETURNING key, value, updated_at`,
      [key, String(value)]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Settings] Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

router.get('/biaya/:tahun', verifyToken, async (req, res) => {
  try {
    const { tahun } = req.params;
    const result = await pool.query(
      "SELECT value FROM settings WHERE key = $1",
      [`biaya_${tahun}`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Biaya untuk tahun tersebut tidak ditemukan' });
    }

    res.json({ success: true, biaya: parseInt(result.rows[0].value) || 0 });
  } catch (error) {
    console.error('[Settings] Error fetching biaya:', error);
    res.status(500).json({ error: 'Failed to fetch biaya' });
  }
});

router.get('/schedule', verifyToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'registration_schedule'");
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({ success: true, data: JSON.parse(result.rows[0].value) });
  } catch (error) {
    console.error('[Settings] Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.put('/schedule', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { wave1, wave2, wave3 } = req.body;
    const schedule = { wave1, wave2, wave3 };
    const value = JSON.stringify(schedule);

    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('registration_schedule', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
       RETURNING key, value, updated_at`,
      [value]
    );

    res.json({ success: true, data: JSON.parse(result.rows[0].value) });
  } catch (error) {
    console.error('[Settings] Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

module.exports = router;
