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
const adminRoutes = require('./routes/admin');
const pengujiRoutes = require('./routes/penguji');
const pengasuhRoutes = require('./routes/pengasuh');
const settingsRoutes = require('./routes/settings');
const { verifyToken, verifyRole } = require('./middleware/auth');
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
  'http://localhost:3001',
  'https://delimatanjungrejo.netlify.app',
  'https://www.delimatanjungrejo.netlify.app',
  'https://psbdelimatanjungrejo.netlify.app',
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

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'PSB DELIMA Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      debug: '/api/debug/db',
      auth: {
        register: 'POST /api/user/register',
        login: 'POST /api/user/login'
      },
      private_auth: {
        login: 'POST /api/private/login',
        register: 'POST /api/private/register (admin only)'
      },
      pendaftaran: {
        list: 'GET /api/pendaftaran/santri',
        get: 'GET /api/pendaftaran/santri/:id',
        create: 'POST /api/pendaftaran/santri',
        status: 'GET /api/pendaftaran/status/:email',
        updateStatus: 'PATCH /api/pendaftaran/santri/:id/status'
      },
      pembayaran: {
        list: 'GET /api/pembayaran',
        get: 'GET /api/pembayaran/:id',
        create: 'POST /api/pembayaran',
        update: 'PUT /api/pembayaran/:id'
      },
      pengujian: {
        santriList: 'GET /api/pengujian/santri',
        inputNilai: 'POST /api/pengujian/santri/:id/nilai',
        getNilai: 'GET /api/pengujian/santri/:id/nilai'
      }
    }
  });
});

app.use('/api/user', authRoutes);
app.use('/api/private', privateAuthRoutes);
app.use('/api/pendaftaran', pendaftaranRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/pengujian', pengujianRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/penguji', pengujiRoutes);
app.use('/api/pengasuh', pengasuhRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/debug/db', verifyToken, verifyRole(['admin']), async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

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
      database: 'connection failed'
    });
  }
});

// 404 Handler - harus sebelum global error handler
app.use((req, res) => {
  console.warn(`404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    code: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: '/api (untuk dokumentasi lengkap)'
  });
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

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
