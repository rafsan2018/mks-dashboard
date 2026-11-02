'use strict';

const router = require('express').Router();
const registerDefinitionController = require('../controllers/registerDefinitionController');
const { validate } = require('../middleware/validate');
const {
  createRegisterDefinitionValidator,
  updateRegisterDefinitionValidator,
  registerIdValidator,
} = require('../validators/registerDefinitionValidator');
const { param } = require('express-validator');

// GET /api/v1/registers/data-types  - Distinct data types metadata
router.get('/data-types', registerDefinitionController.getDataTypes);

// GET /api/v1/registers/device/:deviceId  - Registers for a specific device
router.get('/device/:deviceId',
  [param('deviceId').isInt({ min: 1 }).withMessage('Device ID must be a positive integer')],
  validate,
  registerDefinitionController.getRegistersByDevice
);

// GET /api/v1/registers  - Paginated registers list with filters
router.get('/', registerDefinitionController.getAllRegisters);

// GET /api/v1/registers/:id  - Get register by ID
router.get('/:id(\\d+)', registerIdValidator, validate, registerDefinitionController.getRegisterById);

// POST /api/v1/registers  - Create single register definition
router.post('/', createRegisterDefinitionValidator, validate, registerDefinitionController.createRegister);

// POST /api/v1/registers/bulk/:deviceId  - Bulk create registers for a device
router.post('/bulk/:deviceId',
  [param('deviceId').isInt({ min: 1 }).withMessage('Device ID must be a positive integer')],
  validate,
  registerDefinitionController.bulkCreateRegisters
);

// PUT /api/v1/registers/:id  - Update register definition
router.put('/:id(\\d+)', updateRegisterDefinitionValidator, validate, registerDefinitionController.updateRegister);

// DELETE /api/v1/registers/:id  - Delete register definition
router.delete('/:id(\\d+)', registerIdValidator, validate, registerDefinitionController.deleteRegister);

module.exports = router;
