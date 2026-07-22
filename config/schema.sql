-- Database: delima_psb

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id_user SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create pendaftaran_santri table
CREATE TABLE IF NOT EXISTS pendaftaran_santri (
    id_pendaftaran SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id_user),
    email VARCHAR(100) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    nama_panggilan VARCHAR(50),
    jenis_kelamin VARCHAR(20) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    anak_ke INTEGER,
    pendidikan_terakhir VARCHAR(50),
    tinggal_bersama VARCHAR(50),
    alamat_santri TEXT,
    nama_ayah VARCHAR(100),
    ttl_ayah VARCHAR(150),
    usia_ayah INTEGER,
    pekerjaan_ayah VARCHAR(50),
    penghasilan_ayah VARCHAR(50),
    alamat_ayah TEXT,
    telp_ayah VARCHAR(20),
    nama_ibu VARCHAR(100),
    ttl_ibu VARCHAR(150),
    usia_ibu INTEGER,
    pekerjaan_ibu VARCHAR(50),
    penghasilan_ibu VARCHAR(50),
    alamat_ibu TEXT,
    telp_ibu VARCHAR(20),
    berkas_akta TEXT,
    berkas_kk TEXT,
    berkas_ktp_ortu TEXT,
    berkas_ijazah TEXT,
    berkas_foto TEXT,
    berkas_surat_sehat TEXT,
    foto TEXT,
     status VARCHAR(20) DEFAULT 'pending',
     status_pembayaran VARCHAR(20),
     catatan TEXT,
     tahun_pendaftaran INTEGER,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for pendaftaran_santri
CREATE INDEX IF NOT EXISTS idx_pendaftaran_email ON pendaftaran_santri(email);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_status ON pendaftaran_santri(status);
ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS status_pembayaran VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_status_pembayaran ON pendaftaran_santri(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_pendaftaran_created ON pendaftaran_santri(created_at DESC);


-- Table: pembayaran
CREATE TABLE IF NOT EXISTS pembayaran (
    id_pembayaran SERIAL PRIMARY KEY,
    id_pendaftaran INTEGER REFERENCES pendaftaran_santri(id_pendaftaran),
    email VARCHAR(100) NOT NULL,
    bukti_pembayaran TEXT,
    status_pembayaran VARCHAR(20) DEFAULT 'pending',
    nominal VARCHAR(50),
    metode_pembayaran VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pembayaran_email ON pembayaran(email);
CREATE INDEX IF NOT EXISTS idx_pembayaran_id_pendaftaran ON pembayaran(id_pendaftaran);
CREATE INDEX IF NOT EXISTS idx_pembayaran_status ON pembayaran(status_pembayaran);

-- Table: nilai_ujian
CREATE TABLE IF NOT EXISTS nilai_ujian (
    id_nilai SERIAL PRIMARY KEY,
    id_pendaftaran INTEGER REFERENCES pendaftaran_santri(id_pendaftaran) ON DELETE CASCADE,
    nilai_alquran DECIMAL(5,2) CHECK (nilai_alquran >= 0 AND nilai_alquran <= 100),
    nilai_kitab DECIMAL(5,2) CHECK (nilai_kitab >= 0 AND nilai_kitab <= 100),
    level_alquran VARCHAR(50),
    level_kitab VARCHAR(50),
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one santri only has one nilai record (unique constraint)
    UNIQUE(id_pendaftaran)
);

-- Indexes for nilai_ujian performance
CREATE INDEX IF NOT EXISTS idx_nilai_pendaftaran ON nilai_ujian(id_pendaftaran);

-- Add missing column for nilai status tracking on pendaftaran_santri
-- ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS nilai_status VARCHAR(20) DEFAULT 'belum_dinilai';

-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default active year if not exists
INSERT INTO settings (key, value) VALUES ('active_year', EXTRACT(YEAR FROM CURRENT_DATE)::TEXT) ON CONFLICT (key) DO NOTHING;

-- Insert default biaya for current year if not exists
INSERT INTO settings (key, value) VALUES ('biaya_2025', '300000') ON CONFLICT (key) DO NOTHING;
