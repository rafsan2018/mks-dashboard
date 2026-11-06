'use strict';

const router = require('express').Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const deviceRoutes = require('./deviceRoutes');
const comportRoutes = require('./comportRoutes');
const registerDefinitionRoutes = require('./registerDefinitionRoutes');
const registerReadingRoutes = require('./registerReadingRoutes');
const thresholdRoutes = require('./thresholdRoutes');
const alertRecipientRoutes = require('./alertRecipientRoutes');

// ─── Route Registration ────────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/comports', comportRoutes);
router.use('/registers', registerDefinitionRoutes);
router.use('/readings', registerReadingRoutes);
router.use('/thresholds', thresholdRoutes);
router.use('/alert-recipients', alertRecipientRoutes);

// ─── API Info Endpoint ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Modbus Register Monitoring API',
    version: 'v1',
    documentation: 'See README.md for full API documentation',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      devices: '/api/v1/devices',
      comports: '/api/v1/comports',
      registers: '/api/v1/registers',
      readings: '/api/v1/readings',
      thresholds: '/api/v1/thresholds',
      alertRecipients: '/api/v1/alert-recipients',
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
