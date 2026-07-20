const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE || 'delima_psb',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'rikcho',
      }
);

module.exports = pool;
