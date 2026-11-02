'use strict';

const router = require('express').Router();
const thresholdController = require('../controllers/thresholdController');
const { validate } = require('../middleware/validate');
const {
  createThresholdValidator,
  updateThresholdValidator,
  thresholdIdValidator,
  thresholdQueryValidator,
} = require('../validators/thresholdValidator');
const { param, body } = require('express-validator');

// GET /api/v1/thresholds/register/:registerId  - Get all thresholds for a specific register
router.get('/register/:registerId',
  [param('registerId').isInt({ min: 1 }).withMessage('Register ID must be a positive integer')],
  validate,
  thresholdController.getThresholdsByRegister
);

// GET /api/v1/thresholds  - Get paginated thresholds with filters
router.get('/',
  thresholdQueryValidator,
  validate,
  thresholdController.getAllThresholds
);

// GET /api/v1/thresholds/:id  - Get threshold by ID (numeric ID only)
router.get('/:id(\\d+)',
  thresholdIdValidator,
  validate,
  thresholdController.getThresholdById
);

// POST /api/v1/thresholds  - Create new threshold
router.post('/',
  createThresholdValidator,
  validate,
  thresholdController.createThreshold
);

// PUT /api/v1/thresholds/:id  - Update threshold
router.put('/:id(\\d+)',
  updateThresholdValidator,
  validate,
  thresholdController.updateThreshold
);

// PATCH /api/v1/thresholds/:id/status  - Toggle active status
router.patch('/:id(\\d+)/status',
  thresholdIdValidator,
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  validate,
  thresholdController.toggleThresholdStatus
);

// DELETE /api/v1/thresholds/:id  - Delete threshold
router.delete('/:id(\\d+)',
  thresholdIdValidator,
  validate,
  thresholdController.deleteThreshold
);

module.exports = router;
