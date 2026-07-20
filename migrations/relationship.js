const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id_user)
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pendaftaran_user_id ON pendaftaran_santri(user_id)
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        UPDATE pendaftaran_santri 
        SET user_id = (
          SELECT id_user FROM users 
          WHERE users.email = pendaftaran_santri.email
        )
        WHERE user_id IS NULL 
        AND EXISTS (
          SELECT 1 FROM users 
          WHERE users.email = pendaftaran_santri.email
        )
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pembayaran 
        ADD COLUMN IF NOT EXISTS nominal INTEGER
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pembayaran 
        ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(50)
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pembayaran 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pembayaran 
        ADD CONSTRAINT IF NOT EXISTS fk_pembayaran_pendaftaran 
        FOREIGN KEY (id_pendaftaran) 
        REFERENCES pendaftaran_santri(id_pendaftaran)
        ON DELETE CASCADE
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD CONSTRAINT IF NOT EXISTS fk_pendaftaran_users 
        FOREIGN KEY (user_id) 
        REFERENCES users(id_user)
        ON DELETE SET NULL
      `);
    } catch (e) {
    }
    
    // Add nilai columns to pendaftaran_santri table
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD COLUMN IF NOT EXISTS nilai_alquran INTEGER
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD COLUMN IF NOT EXISTS nilai_kitab INTEGER
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD COLUMN IF NOT EXISTS level_alquran VARCHAR(50)
      `);
    } catch (e) {
    }
    
    try {
      await client.query(`
        ALTER TABLE pendaftaran_santri 
        ADD COLUMN IF NOT EXISTS level_kitab VARCHAR(50)
      `);
    } catch (e) {
    }

  } catch (error) {
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = runMigration;
