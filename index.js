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
const PORT = process.env.PORT || 5001;

const initializeDatabase = async () => {
  try {
    await runMigration();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

app.use(cors());
app.use(express.json());

app.use('/api/user', authRoutes);
app.use('/api/private', privateAuthRoutes);
app.use('/api/pendaftaran', pendaftaranRoutes);
app.use('/api/pembayaran', pembayaranRoutes);
app.use('/api/pengujian', pengujianRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();

module.exports = app;