const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken, verifyRole, isStaff, STAFF_ROLES } = require('../middleware/auth');

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

router.post('/santri', verifyToken, async (req, res) => {
  try {
    const {
      email,
      namaLengkap,
      namaPanggilan,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      anakKe,
      pendidikanTerakhir,
      tinggalBersama,
      alamatSantri,
      namaAyah,
      ttlAyah,
      usiaAyah,
      pekerjaanAyah,
      penghasilanAyah,
      alamatAyah,
      telpAyah,
      namaIbu,
      ttlIbu,
      usiaIbu,
      pekerjaanIbu,
      penghasilanIbu,
      alamatIbu,
      telpIbu,
      berkas,
    } = req.body;

    if (!namaLengkap || !email || !jenisKelamin) {
      return res.status(400).json({
        error: 'Mohon isi kolom yang wajib diisi (Nama Lengkap, Email, Jenis Kelamin)'
      });
    }

    if (!isStaff(req.user) && req.user.email?.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden - email tidak sesuai akun login' });
    }

    const parsedAnakKe = anakKe ? parseInt(anakKe, 10) : null;
    const parsedUsiaAyah = usiaAyah ? parseInt(usiaAyah, 10) : null;
    const parsedUsiaIbu = usiaIbu ? parseInt(usiaIbu, 10) : null;

    const existing = await pool.query(
      'SELECT id_pendaftaran FROM pendaftaran_santri WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'Email ini sudah memiliki pendaftaran. Hubungi panitia jika perlu perubahan.'
      });
    }

    let userId = req.user.id || null;
    try {
      const userResult = await pool.query(
        'SELECT id_user FROM users WHERE email = $1',
        [email]
      );
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id_user;
      }
    } catch (e) {
      console.error('Failed to query user ID for email', email, e.message);
    }

    const result = await pool.query(
      `INSERT INTO pendaftaran_santri (
        user_id, email, nama_lengkap, nama_panggilan, jenis_kelamin, tempat_lahir, tanggal_lahir,
        anak_ke, pendidikan_terakhir, tinggal_bersama, alamat_santri,
        nama_ayah, ttl_ayah, usia_ayah, pekerjaan_ayah, penghasilan_ayah, alamat_ayah, telp_ayah,
        nama_ibu, ttl_ibu, usia_ibu, pekerjaan_ibu, penghasilan_ibu, alamat_ibu, telp_ibu,
        berkas_akta, berkas_kk, berkas_ktp_ortu, berkas_ijazah, berkas_foto, berkas_surat_sehat,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING id_pendaftaran, created_at`,
      [
        userId, email, namaLengkap, namaPanggilan, jenisKelamin, tempatLahir, tanggalLahir,
        parsedAnakKe, pendidikanTerakhir, tinggalBersama, alamatSantri,
        namaAyah, ttlAyah, parsedUsiaAyah, pekerjaanAyah, penghasilanAyah, alamatAyah, telpAyah,
        namaIbu, ttlIbu, parsedUsiaIbu, pekerjaanIbu, penghasilanIbu, alamatIbu, telpIbu,
        berkas?.akta?.url || null,
        berkas?.kk?.url || null,
        berkas?.ktpOrtu?.url || null,
        berkas?.ijazah?.url || null,
        berkas?.foto?.url || null,
        berkas?.suratSehat?.url || null,
        'pending'
      ]
    );

    const registration = result.rows[0];

    res.status(201).json({
      message: 'Pendaftaran berhasil',
      data: {
        id_pendaftaran: registration.id_pendaftaran,
        created_at: registration.created_at
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.get('/status/:email', verifyToken, async (req, res) => {
  try {
    const { email } = req.params;

    if (!isStaff(req.user) && req.user.email?.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden - access denied' });
    }

    const result = await pool.query(
      `SELECT status FROM pendaftaran_santri WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ status: '', payment_status: '' });
    }

    const registration = result.rows[0];

    const paymentResult = await pool.query(
      `SELECT status_pembayaran FROM pembayaran WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    res.json({
      status: registration.status || '',
      payment_status: paymentResult.rows.length > 0 ? paymentResult.rows[0].status_pembayaran : ''
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/santri', verifyToken, verifyRole(STAFF_ROLES), async (req, res) => {
  try {
    const isPengasuhOnly = req.user.role === 'pengasuh';
    const result = await pool.query(
      `SELECT id_pendaftaran, email, nama_lengkap, nama_panggilan, jenis_kelamin,
        tempat_lahir, tanggal_lahir, anak_ke,
        telp_ayah, telp_ibu, pendidikan_terakhir, nama_ayah, nama_ibu, alamat_santri,
        status, status_pembayaran, catatan, created_at
        FROM pendaftaran_santri
        ${isPengasuhOnly ? "WHERE status IN ('accepted', 'completed')" : ''}
        ORDER BY created_at DESC`
    );

    const formattedData = result.rows.map(row => ({
      ...row,
      tanggal_lahir: formatDate(row.tanggal_lahir),
      created_at: formatDate(row.created_at),
    }));

    res.json({ data: formattedData });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/santri/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pendaftaran_santri WHERE id_pendaftaran = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    const data = result.rows[0];

    if (!isStaff(req.user) && req.user.email?.toLowerCase() !== String(data.email).toLowerCase()) {
      return res.status(403).json({ error: 'Forbidden - access denied' });
    }

    const formattedData = {
      ...data,
      tanggal_lahir: formatDate(data.tanggal_lahir),
      created_at: formatDate(data.created_at),
    };

    res.json({ data: formattedData });
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/santri/:id/status', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { status, catatan } = req.body;
    const { id } = req.params;

    const validStatuses = ['pending', 'accepted', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE pendaftaran_santri
        SET status = $1, catatan = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id_pendaftaran = $3
        RETURNING *`,
      [status, catatan || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({
      message: 'Status updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/santri/:id', verifyToken, verifyRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM pendaftaran_santri WHERE id_pendaftaran = $1 RETURNING id_pendaftaran',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json({ message: 'Registration deleted successfully' });
  } catch (error) {
    console.error('Delete registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/santri/:id/nilai', verifyToken, verifyRole(['penguji', 'admin']), async (req, res) => {
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
    res.status(500).json({ error: 'Server error while submitting nilai' });
  }
});

router.get('/santri/:id/nilai', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const ownerCheck = await pool.query(
      'SELECT email FROM pendaftaran_santri WHERE id_pendaftaran = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Santri not found' });
    }

    if (
      !isStaff(req.user) &&
      req.user.email?.toLowerCase() !== String(ownerCheck.rows[0].email).toLowerCase()
    ) {
      return res.status(403).json({ error: 'Forbidden - access denied' });
    }

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

module.exports = router;
