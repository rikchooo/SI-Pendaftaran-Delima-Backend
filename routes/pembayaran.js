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

router.post('/', async (req, res) => {
  try {
    const { email, buktiPembayaran } = req.body;

    if (!email || !buktiPembayaran) {
      return res.status(400).json({
        error: 'Email dan bukti pembayaran diperlukan'
      });
    }

    const pendaftaranResult = await pool.query(
      'SELECT id_pendaftaran FROM pendaftaran_santri WHERE email = $1',
      [email]
    );

    if (pendaftaranResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pendaftaran tidak ditemukan' });
    }

    const idPendaftaran = pendaftaranResult.rows[0].id_pendaftaran;

    const existingPayment = await pool.query(
      'SELECT id_pembayaran FROM pembayaran WHERE id_pendaftaran = $1',
      [idPendaftaran]
    );

    async function syncPendaftaranStatus() {
      await pool.query(
        `UPDATE pendaftaran_santri
         SET status_pembayaran = 'submitted', updated_at = CURRENT_TIMESTAMP
         WHERE id_pendaftaran = $1`,
        [idPendaftaran]
      );
    }

    if (existingPayment.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE pembayaran
         SET bukti_pembayaran = $1, status_pembayaran = 'submitted', updated_at = CURRENT_TIMESTAMP
         WHERE id_pendaftaran = $2
         RETURNING id_pembayaran, id_pendaftaran, email, bukti_pembayaran, status_pembayaran, created_at`,
        [buktiPembayaran.url, idPendaftaran]
      );

      await syncPendaftaranStatus();

      return res.status(200).json({
        message: 'Bukti pembayaran berhasil diperbarui',
        data: updated.rows[0]
      });
    }

    const result = await pool.query(
      `INSERT INTO pembayaran (
        id_pendaftaran, email, bukti_pembayaran, status_pembayaran, created_at
      ) VALUES ($1, $2, $3, 'submitted', CURRENT_TIMESTAMP)
      RETURNING id_pembayaran, id_pendaftaran, email, bukti_pembayaran, status_pembayaran, created_at`,
      [idPendaftaran, email, buktiPembayaran.url]
    );

    await syncPendaftaranStatus();

    res.status(201).json({
      message: 'Bukti pembayaran berhasil diupload',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Upload payment error:', error);
    res.status(500).json({
      error: 'Server error during payment upload',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id_pembayaran, p.id_pendaftaran, p.email, p.bukti_pembayaran,
        p.created_at,
        ps.nama_lengkap as nama_santri, ps.user_id
        FROM pembayaran p
        LEFT JOIN pendaftaran_santri ps ON p.id_pendaftaran = ps.id_pendaftaran
        ORDER BY p.created_at DESC`
    );

    const formattedData = result.rows.map(row => ({
      ...row,
      created_at: formatDate(row.created_at),
    }));

    res.json({ data: formattedData });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id_pembayaran, id_pendaftaran, email, bukti_pembayaran, created_at
        FROM pembayaran
        WHERE id_pembayaran = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    }

    const data = result.rows[0];
    res.json({ data: { ...data, created_at: formatDate(data.created_at) } });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/pendaftaran/:idPendaftaran', async (req, res) => {
  try {
    const { idPendaftaran } = req.params;
    const result = await pool.query(
      `SELECT p.id_pembayaran, p.id_pendaftaran, p.email, p.bukti_pembayaran, p.created_at,
        ps.nama_lengkap, ps.jenis_kelamin, ps.tempat_lahir, ps.tanggal_lahir,
        ps.anak_ke, ps.pendidikan_terakhir, ps.alamat_santri,
        ps.nama_ayah, ps.nama_ibu, ps.telp_ayah, ps.created_at as registration_date
        FROM pembayaran p
        LEFT JOIN pendaftaran_santri ps ON p.id_pendaftaran = ps.id_pendaftaran
        WHERE p.id_pendaftaran = $1`,
      [idPendaftaran]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    }

    const data = result.rows[0];
    res.json({ data: { ...data, created_at: formatDate(data.created_at), tanggal_lahir: formatDate(data.tanggal_lahir), registration_date: formatDate(data.registration_date) } });
  } catch (error) {
    console.error('Get payment by pendaftaran error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      `SELECT id_pembayaran, id_pendaftaran, email, bukti_pembayaran, created_at
        FROM pembayaran
        WHERE email = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    }

    const data = result.rows[0];
    res.json({ data: { ...data, created_at: formatDate(data.created_at) } });
  } catch (error) {
    console.error('Get payment by email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status_pembayaran, nominal, metode_pembayaran } = req.body;

    const result = await pool.query(
      `UPDATE pembayaran
         SET status_pembayaran = COALESCE($1, status_pembayaran),
             nominal = COALESCE($2, nominal),
             metode_pembayaran = COALESCE($3, metode_pembayaran),
             updated_at = CURRENT_TIMESTAMP
       WHERE id_pembayaran = $4
       RETURNING id_pembayaran, id_pendaftaran, email, bukti_pembayaran, status_pembayaran, nominal, metode_pembayaran, created_at`,
      [status_pembayaran, nominal, metode_pembayaran, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    }

    const updatedPayment = result.rows[0];

    if (status_pembayaran) {
      await pool.query(
        `UPDATE pendaftaran_santri
         SET status_pembayaran = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id_pendaftaran = $2`,
        [status_pembayaran, updatedPayment.id_pendaftaran]
      );
    }

    res.json({
      message: 'Pembayaran berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM pembayaran WHERE id_pembayaran = $1 RETURNING id_pembayaran',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    }

    res.json({ message: 'Pembayaran berhasil dihapus' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;