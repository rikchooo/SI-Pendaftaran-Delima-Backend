const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      database: process.env.PGDATABASE || 'delima_psb',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'rikcho',
    };

const pool = new Pool(dbConfig);

console.log('[Database] Config:', {
  usingDatasourceUrl: !!process.env.DATABASE_URL,
  host: dbConfig.host || 'from DATABASE_URL',
  database: dbConfig.database || 'from DATABASE_URL',
  ssl: !!dbConfig.ssl,
});

pool.on('connect', () => {
  console.log('[Database] New client connected');
});

pool.on('error', (err) => {
  console.error('[Database] Pool error:', err);
});

module.exports = pool;
