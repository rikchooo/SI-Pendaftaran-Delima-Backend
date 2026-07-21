const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./config/database');
const authRoutes = require('./routes/auth');
const privateAuthRoutes = require('./routes/privateAuth');
const pendaftaranRoutes = require('./routes/pendaftaran');
const pembayaranRoutes = require('./routes/pembayaran');
const pengujianRoutes = require('./routes/pengujian');
const runMigration = require('./migrations/relationship');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://psbdelimatanjungrejo.netlify.app/',
  'https://www.psbdelimatanjungrejo.netlify.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/user', authRoutes);
app.use('/api/private', privateAuthRoutes);
app.use('/api/pendaftaran', pendaftaranRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/pengujian', pengujianRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/debug/db', async (req, res) => {
  try {
    const client = await pool.connect();
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const usersCount = await client.query('SELECT COUNT(*) FROM users');
    const pendaftaranCount = await client.query('SELECT COUNT(*) FROM pendaftaran_santri');
    const pembayaranCount = await client.query('SELECT COUNT(*) FROM pembayaran');
    client.release();
    
    res.json({
      status: 'ok',
      database: 'connected',
      databaseUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/\/\/.*@/, '//***@') : 'Not set',
      tables: tablesResult.rows.map(r => r.table_name),
      counts: {
        users: parseInt(usersCount.rows[0].count),
        pendaftaran_santri: parseInt(pendaftaranCount.rows[0].count),
        pembayaran: parseInt(pembayaranCount.rows[0].count)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug DB error:', error);
    res.status(500).json({
      status: 'error',
      database: 'connection failed',
      error: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const runSchema = async () => {
  const schemaPath = path.join(__dirname, 'config', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  const client = await pool.connect();
  
  try {
    // Remove comments
    let cleanSql = schemaSql.replace(/\/\*[\s\S]*?\*\//g, '');
    cleanSql = cleanSql.replace(/--.*/g, '');
    
    // Split into statements and execute
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    for (const statement of statements) {
      try {
        await client.query(statement);
        console.log('Executed:', statement.substring(0, 80) + '...');
      } catch (stmtError) {
        console.error('Failed to execute statement:', statement.substring(0, 80), stmtError.message);
      }
    }
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log('Tables in database:', tables.join(', ') || 'none');
    
    const requiredTables = ['users', 'pendaftaran_santri', 'pembayaran', 'nilai_ujian'];
    const missingTables = requiredTables.filter(t => !tables.includes(t));
    
    if (missingTables.length > 0) {
      console.error('WARNING: Missing tables after schema initialization:', missingTables.join(', '));
      console.error('This may cause database operations to fail.');
    } else {
      console.log('All required tables exist.');
    }
    
    console.log('Schema initialization completed');
  } catch (error) {
    console.error('Schema initialization failed:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const initializeDatabase = async () => {
  try {
    await runSchema();
    await runMigration();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Using DATABASE_URL' : 'Using individual DB credentials'}`);
  });
};

if (process.env.VERCEL !== '1') {
  startServer();
}

module.exports = app;
