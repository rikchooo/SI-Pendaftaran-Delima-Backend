const { Pool } = require('pg');
require('dotenv').config();

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

let dbConfig;

if (hasDatabaseUrl) {
  // Managed Postgres (Railway, etc.) often uses certificates that need this flag.
  // Set DB_SSL_REJECT_UNAUTHORIZED=true when you have a verified CA chain.
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
    },
  };
} else {
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  if (!password) {
    throw new Error(
      'Database password is missing. Set DATABASE_URL or PGPASSWORD/DB_PASSWORD in environment.'
    );
  }

  dbConfig = {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    database: process.env.PGDATABASE || process.env.DB_NAME || 'delima_psb',
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password,
  };
}

const pool = new Pool(dbConfig);

console.log('[Database] Config:', {
  usingDatasourceUrl: hasDatabaseUrl,
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
