const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

router.post('/santri/:id/nilai', async (req, res) => {
  try {
    const { id } = req.params;
    const { nilai_alquran, nilai_kitab, level_alquran, level_kitab, catatan } = req.body;

    if (nilai_alquran === undefined || nilai_kitab === undefined) {
      return res.status(400).json({
        error: 'Please provide required fields (nilai_alquran, nilai_kitab)'
      });
    }

    const alquran = parseFloat(nilai_alquran);
    const kitab = parseFloat(nilai_kitab);

    if (isNaN(alquran) || isNaN(kitab)) {
      return res.status(400).json({ error: 'Nilai must be valid numbers' });
    }

    if (alquran < 0 || alquran > 100 || kitab < 0 || kitab > 100) {
      return res.status(400).json({ error: 'Nilai must be between 0 and 100' });
    }

    const santriCheck = await pool.query(
      'SELECT id_pendaftaran FROM pendaftaran_santri WHERE id_pendaftaran = $1',
      [id]
    );

    if (santriCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Santri not found' });
    }

    const result = await pool.query(
      `INSERT INTO nilai_ujian (id_pendaftaran, nilai_alquran, nilai_kitab, level_alquran, level_kitab, catatan)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id_pendaftaran)
        DO UPDATE SET
          nilai_alquran = EXCLUDED.nilai_alquran,
          nilai_kitab = EXCLUDED.nilai_kitab,
          level_alquran = EXCLUDED.level_alquran,
          level_kitab = EXCLUDED.level_kitab,
          catatan = EXCLUDED.catatan,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
      [id, alquran, kitab, level_alquran || null, level_kitab || null, catatan || null]
    );

    await pool.query(
      `UPDATE pendaftaran_santri
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id_pendaftaran = $1`,
      [id]
    );

    res.status(201).json({
      message: 'Nilai berhasil disimpan',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Submit nilai error:', error);
    res.status(500).json({
      error: 'Server error while submitting nilai',
      details: error.message
    });
  }
});

router.get('/santri/:id/nilai', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT nu.*, p.nama_lengkap, p.nama_panggilan, p.foto, p.created_at as pendaftaran_date
        FROM nilai_ujian nu
        JOIN pendaftaran_santri p ON nu.id_pendaftaran = p.id_pendaftaran
        WHERE nu.id_pendaftaran = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nilai not found for this santri' });
    }

    const data = result.rows[0];

    const formattedData = {
      ...data,
      created_at: formatDate(data.created_at),
      pendaftaran_date: formatDate(data.pendaftaran_date),
    };

    res.json({
      message: 'Nilai retrieved successfully',
      data: formattedData
    });
  } catch (error) {
    console.error('Get nilai error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/santri', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id_pendaftaran,
        p.nama_lengkap,
        p.nama_panggilan,
        p.status,
        p.status_pembayaran,
        p.foto,
        p.created_at,
        p.updated_at,
        nu.id_nilai,
        nu.nilai_alquran,
        nu.nilai_kitab,
        nu.level_alquran,
        nu.level_kitab,
        nu.catatan,
        nu.created_at AS nilai_created_at,
        nu.updated_at AS nilai_updated_at
        FROM pendaftaran_santri p
        LEFT JOIN nilai_ujian nu ON p.id_pendaftaran = nu.id_pendaftaran
        ORDER BY p.created_at DESC`
    );

    const data = result.rows.map((row) => {
      const isCompleted = row.status === 'completed';
      return {
        id_pendaftaran: row.id_pendaftaran,
        nama_lengkap: row.nama_lengkap,
        nama_panggilan: row.nama_panggilan,
        status: row.status,
        status_pembayaran: row.status_pembayaran,
        foto: row.foto,
        created_at: row.created_at,
        updated_at: row.updated_at,
        nilai_alquran: isCompleted ? (row.nilai_alquran != null ? parseFloat(row.nilai_alquran) : null) : null,
        nilai_kitab: isCompleted ? (row.nilai_kitab != null ? parseFloat(row.nilai_kitab) : null) : null,
        level_alquran: isCompleted ? row.level_alquran : null,
        level_kitab: isCompleted ? row.level_kitab : null,
      };
    });

    res.json({ data });
  } catch (error) {
    console.error('Get all nilai error:', error);
    res.status(500).json({
      error: 'Server error while fetching nilai data',
      details: error.message
    });
  }
});

module.exports = router;