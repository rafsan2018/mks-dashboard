'use strict';

const router = require('express').Router();
const deviceController = require('../controllers/deviceController');
const { validate } = require('../middleware/validate');
const { createDeviceValidator, updateDeviceValidator, deviceIdValidator } = require('../validators/deviceValidator');
const { body } = require('express-validator');

// GET /api/v1/devices  - List devices (paginated, filterable)
router.get('/', deviceController.getAllDevices);

// GET /api/v1/devices/active  - List active devices (for dropdowns)
router.get('/active', deviceController.getActiveDevices);

// GET /api/v1/devices/:id  - Get device by ID
router.get('/:id(\\d+)', deviceIdValidator, validate, deviceController.getDeviceById);

// POST /api/v1/devices  - Create new device
router.post('/', createDeviceValidator, validate, deviceController.createDevice);

// PUT /api/v1/devices/:id  - Update device
router.put('/:id(\\d+)', updateDeviceValidator, validate, deviceController.updateDevice);

// PATCH /api/v1/devices/:id/status  - Toggle device status
router.patch('/:id(\\d+)/status',
  deviceIdValidator,
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  validate,
  deviceController.toggleDeviceStatus
);

// DELETE /api/v1/devices/:id  - Delete device
router.delete('/:id(\\d+)', deviceIdValidator, validate, deviceController.deleteDevice);

module.exports = router;
