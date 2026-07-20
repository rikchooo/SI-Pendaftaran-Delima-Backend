const { Pool } = require('pg');
require('dotenv').config();

// Prefer Railway's DATABASE_URL when available (private networking),
// falling back to individual PG* variables provided by the Railway
// PostgreSQL reference variables, with sane local defaults for
// development outside of Railway.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT || 5432,
      database: process.env.PGDATABASE || 'delima_psb',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'rikcho',
    });

module.exports = pool;