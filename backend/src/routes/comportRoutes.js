'use strict';

const router = require('express').Router();
const comportController = require('../controllers/comportController');
const { validate } = require('../middleware/validate');
const { createComportValidator, updateComportValidator, comportIdValidator } = require('../validators/comportValidator');

// GET /api/v1/comports  - List comports (paginated)
router.get('/', comportController.getAllComports);

// GET /api/v1/comports/list  - List all comports (for dropdowns)
router.get('/list', comportController.getComportsList);

// GET /api/v1/comports/:id  - Get comport by ID
router.get('/:id(\\d+)', comportIdValidator, validate, comportController.getComportById);

// POST /api/v1/comports  - Create new comport
router.post('/', createComportValidator, validate, comportController.createComport);

// PUT /api/v1/comports/:id  - Update comport
router.put('/:id(\\d+)', updateComportValidator, validate, comportController.updateComport);

// DELETE /api/v1/comports/:id  - Delete comport
router.delete('/:id(\\d+)', comportIdValidator, validate, comportController.deleteComport);

module.exports = router;
