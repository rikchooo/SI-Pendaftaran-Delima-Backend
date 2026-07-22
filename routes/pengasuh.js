const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(verifyRole(['pengasuh', 'admin']));

// Pengasuh melihat santri yang sudah diterima / selesai ujian
router.get('/santri', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.id_pendaftaran,
        ps.nama_lengkap,
        ps.email,
        ps.jenis_kelamin,
        ps.status,
        ps.status_pembayaran,
        ps.telp_ayah,
        ps.telp_ibu,
        ps.nama_ayah,
        ps.nama_ibu,
        ps.alamat_santri,
        ps.pendidikan_terakhir,
        ps.created_at,
        ps.tahun_pendaftaran,
        pb.status_pembayaran AS pembayaran_status,
        pb.nominal,
        pb.metode_pembayaran,
        pb.bukti_pembayaran,
        pb.created_at as pembayaran_created_at,
        nj.nilai_alquran,
        nj.nilai_kitab,
        nj.level_alquran,
        nj.level_kitab,
        nj.catatan as catatan_penguji,
        nj.created_at as nilai_created_at
      FROM pendaftaran_santri ps
      LEFT JOIN pembayaran pb ON ps.id_pendaftaran = pb.id_pendaftaran
      LEFT JOIN nilai_ujian nj ON ps.id_pendaftaran = nj.id_pendaftaran
      WHERE ps.status IN ('accepted', 'completed')
      ORDER BY ps.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('[Pengasuh] Error fetching santri:', error);
    res.status(500).json({ error: 'Failed to fetch santri list' });
  }
});

router.get('/santri/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT ps.*, pb.status_pembayaran, pb.nominal, pb.metode_pembayaran, pb.bukti_pembayaran, pb.created_at as pembayaran_created_at,
        nj.nilai_alquran, nj.nilai_kitab, nj.level_alquran, nj.level_kitab, nj.catatan as catatan_penguji, nj.created_at as nilai_created_at
      FROM pendaftaran_santri ps
      LEFT JOIN pembayaran pb ON ps.id_pendaftaran = pb.id_pendaftaran
      LEFT JOIN nilai_ujian nj ON ps.id_pendaftaran = nj.id_pendaftaran
      WHERE ps.id_pendaftaran = $1 AND ps.status IN ('accepted', 'completed')
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Santri not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Pengasuh] Error fetching santri detail:', error);
    res.status(500).json({ error: 'Failed to fetch santri detail' });
  }
});

module.exports = router;
