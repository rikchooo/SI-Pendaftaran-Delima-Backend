const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

function getLevel(nilai) {
  const n = parseFloat(nilai);
  if (isNaN(n)) return '';
  if (n <= 20) return 'pemula';
  if (n <= 40) return 'dasar';
  if (n <= 60) return 'menengah';
  if (n <= 80) return 'lanjut';
  return 'mahir';
}

router.use(verifyToken);
router.use(verifyRole(['penguji', 'admin']));

router.get('/santri', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.id_pendaftaran,
        ps.nama_lengkap,
        ps.email,
        ps.status,
        nj.id_nilai,
        nj.nilai_alquran,
        nj.nilai_kitab,
        nj.level_alquran,
        nj.level_kitab,
        nj.catatan,
        nj.created_at as nilai_created_at
      FROM pendaftaran_santri ps
      LEFT JOIN nilai_ujian nj ON ps.id_pendaftaran = nj.id_pendaftaran
      ORDER BY ps.nama_lengkap
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('[Penguji] Error fetching santri:', error);
    res.status(500).json({ error: 'Failed to fetch santri list' });
  }
});

router.get('/santri/:id/nilai', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM nilai_ujian 
      WHERE id_pendaftaran = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam scores not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Penguji] Error fetching exam scores:', error);
    res.status(500).json({ error: 'Failed to fetch exam scores' });
  }
});

router.post('/santri/:id/nilai', async (req, res) => {
  try {
    const { id } = req.params;
    const { nilai_alquran, nilai_kitab, catatan } = req.body;

    if (nilai_alquran === undefined || nilai_kitab === undefined) {
      return res.status(400).json({ error: 'Exam scores are required' });
    }

    const alquran = parseFloat(nilai_alquran);
    const kitab = parseFloat(nilai_kitab);

    if (isNaN(alquran) || isNaN(kitab)) {
      return res.status(400).json({ error: 'Nilai must be valid numbers' });
    }

    if (alquran < 0 || alquran > 100 || kitab < 0 || kitab > 100) {
      return res.status(400).json({ error: 'Nilai must be between 0 and 100' });
    }

    const level_alquran = getLevel(alquran);
    const level_kitab = getLevel(kitab);

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
      [id, alquran, kitab, level_alquran, level_kitab, catatan || null]
    );

    await pool.query(
      `UPDATE pendaftaran_santri
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id_pendaftaran = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Exam scores saved',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[Penguji] Error saving exam scores:', error);
    res.status(500).json({ error: 'Failed to save exam scores' });
  }
});

module.exports = router;
