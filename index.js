const express = require('express');
const cors = require('cors');
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
  'https://delimatanjungrejo.netlify.app',
  'https://www.delimatanjungrejo.netlify.app',
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

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const initializeDatabase = async () => {
  try {
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
