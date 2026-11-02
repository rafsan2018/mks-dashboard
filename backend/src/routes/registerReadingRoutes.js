'use strict';

const router = require('express').Router();
const registerReadingController = require('../controllers/registerReadingController');
const { validate } = require('../middleware/validate');
const { readingsRateLimiter } = require('../middleware/rateLimiter');
const {
  createReadingValidator,
  bulkCreateReadingValidator,
  readingQueryValidator,
  readingIdValidator,
} = require('../validators/registerReadingValidator');
const { param, query, header } = require('express-validator');

const readingUserValidator = [
  header('x-user-id')
    .isInt({ min: 1 })
    .withMessage('X-User-Id header must be a positive integer'),
];

// GET /api/v1/readings/dashboard  - Full latest reading snapshot
router.get('/dashboard', registerReadingController.getDashboard);

// GET /api/v1/readings/device/:deviceId/power-trends - Historical power trends (PTotal, STotal, FQTotal) for export & charts
router.get('/device/:deviceId/power-trends',
  readingsRateLimiter,
  [
    param('deviceId').isInt({ min: 1 }).withMessage('Device ID must be a positive integer'),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d']).withMessage('Invalid time range'),
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv'),
  ],
  validate,
  registerReadingController.getDevicePowerTrends
);

// GET /api/v1/readings/device/:deviceId  - Latest value for every registered register
router.get('/device/:deviceId',
  [param('deviceId').isInt({ min: 1 }).withMessage('Device ID must be a positive integer')],
  validate,
  registerReadingController.getByDevice
);

// GET /api/v1/readings/register/:registerId/latest  - Latest single reading
router.get('/register/:registerId/latest',
  [param('registerId').isInt({ min: 1 }).withMessage('Register ID must be a positive integer')],
  validate,
  registerReadingController.getLatestByRegister
);

// GET /api/v1/readings/register/:registerId/timeseries  - Chart data
router.get('/register/:registerId/timeseries',
  readingsRateLimiter,
  [
    param('registerId').isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d']).withMessage('Invalid time range'),
  ],
  validate,
  registerReadingController.getTimeSeries
);

// GET /api/v1/readings/register/:registerId/stats  - Aggregated statistics
router.get('/register/:registerId/stats',
  [
    param('registerId').isInt({ min: 1 }).withMessage('Register ID must be a positive integer'),
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d']).withMessage('Invalid time range'),
  ],
  validate,
  registerReadingController.getStats
);

// GET /api/v1/readings  - Paginated readings with filters
router.get('/', readingsRateLimiter, readingQueryValidator, validate, registerReadingController.getReadings);

// GET /api/v1/readings/:id  - Get reading by ID (numeric ID only)
router.get('/:id(\\d+)', readingIdValidator, validate, registerReadingController.getReadingById);

// POST /api/v1/readings/bulk  - Bulk insert (for Modbus polling service)
router.post('/bulk', readingsRateLimiter, readingUserValidator, bulkCreateReadingValidator, validate, registerReadingController.bulkCreateReadings);

// POST /api/v1/readings  - Create single reading
router.post('/', readingsRateLimiter, readingUserValidator, createReadingValidator, validate, registerReadingController.createReading);

// DELETE /api/v1/readings/purge  - Data retention purge
router.delete('/purge',
  [query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')],
  validate,
  registerReadingController.purgeOldReadings
);

// DELETE /api/v1/readings/:id  - Delete reading (numeric ID only)
router.delete('/:id(\\d+)', readingIdValidator, validate, registerReadingController.deleteReading);

module.exports = router;
