const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(verifyRole(['admin']));

router.get('/santri', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ps.id_pendaftaran,
        ps.email,
        ps.nama_lengkap,
        ps.jenis_kelamin,
        ps.status,
        ps.status_pembayaran,
        ps.created_at,
        u.full_name as user_name
      FROM pendaftaran_santri ps
      LEFT JOIN users u ON ps.user_id = u.id_user
      ORDER BY ps.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('[Admin] Error fetching santri:', error);
    res.status(500).json({ error: 'Failed to fetch santri data' });
  }
});

router.get('/santri/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM pendaftaran_santri 
      WHERE id_pendaftaran = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Santri not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[Admin] Error fetching santri detail:', error);
    res.status(500).json({ error: 'Failed to fetch santri detail' });
  }
});

router.get('/pembayaran', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pb.id_pembayaran,
        pb.email,
        pb.nominal,
        pb.metode_pembayaran,
        pb.bukti_pembayaran,
        pb.status_pembayaran,
        pb.created_at,
        ps.nama_lengkap
      FROM pembayaran pb
      LEFT JOIN pendaftaran_santri ps ON pb.id_pendaftaran = ps.id_pendaftaran
      ORDER BY pb.created_at DESC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('[Admin] Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});

router.patch('/santri/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['pending', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(`
      UPDATE pendaftaran_santri 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_pendaftaran = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Santri not found' });
    }

    res.json({ success: true, message: 'Status updated', data: result.rows[0] });
  } catch (error) {
    console.error('[Admin] Error updating santri status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
