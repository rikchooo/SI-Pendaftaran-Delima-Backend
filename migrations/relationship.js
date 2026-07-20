const pool = require('../config/database');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('[Migration] Starting database migration...');

    const migrations = [
      {
        name: 'Add user_id to pendaftaran_santri',
        sql: `ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id_user)`
      },
      {
        name: 'Create index idx_pendaftaran_user_id',
        sql: `CREATE INDEX IF NOT EXISTS idx_pendaftaran_user_id ON pendaftaran_santri(user_id)`
      },
      {
        name: 'Update user_id from users email',
        sql: `UPDATE pendaftaran_santri SET user_id = (SELECT id_user FROM users WHERE users.email = pendaftaran_santri.email) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE users.email = pendaftaran_santri.email)`
      },
      {
        name: 'Add nominal to pembayaran',
        sql: `ALTER TABLE pembayaran ADD COLUMN IF NOT EXISTS nominal INTEGER`
      },
      {
        name: 'Add metode_pembayaran to pembayaran',
        sql: `ALTER TABLE pembayaran ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(50)`
      },
      {
        name: 'Add updated_at to pembayaran',
        sql: `ALTER TABLE pembayaran ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      },
      {
        name: 'Add foreign key pembayaran to pendaftaran',
        sql: `DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_pembayaran_pendaftaran'
              ) THEN
                ALTER TABLE pembayaran 
                ADD CONSTRAINT fk_pembayaran_pendaftaran 
                FOREIGN KEY (id_pendaftaran) 
                REFERENCES pendaftaran_santri(id_pendaftaran)
                ON DELETE CASCADE;
              END IF;
            END;
            $$;`
      },
      {
        name: 'Add foreign key pendaftaran to users',
        sql: `DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'fk_pendaftaran_users'
              ) THEN
                ALTER TABLE pendaftaran_santri 
                ADD CONSTRAINT fk_pendaftaran_users 
                FOREIGN KEY (user_id) 
                REFERENCES users(id_user)
                ON DELETE SET NULL;
              END IF;
            END;
            $$;`
      },
      {
        name: 'Add nilai_alquran to pendaftaran_santri',
        sql: `ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS nilai_alquran INTEGER`
      },
      {
        name: 'Add nilai_kitab to pendaftaran_santri',
        sql: `ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS nilai_kitab INTEGER`
      },
      {
        name: 'Add level_alquran to pendaftaran_santri',
        sql: `ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS level_alquran VARCHAR(50)`
      },
      {
        name: 'Add level_kitab to pendaftaran_santri',
        sql: `ALTER TABLE pendaftaran_santri ADD COLUMN IF NOT EXISTS level_kitab VARCHAR(50)`
      }
    ];

    for (const migration of migrations) {
      try {
        await client.query(migration.sql);
        console.log(`[Migration] OK: ${migration.name}`);
      } catch (error) {
        console.error(`[Migration] FAILED: ${migration.name}`, error.message);
      }
    }

    console.log('[Migration] Migration completed');
  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    throw error;
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
