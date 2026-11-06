'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const alertSettingsController = require('../controllers/alertSettingsController');
const { validate } = require('../middleware/validate');

// GET /api/v1/alert-settings  - SMS settings, genset-start recipients and the rules the page shows
router.get('/', alertSettingsController.getSettings);

// PUT /api/v1/alert-settings  - Save any of the settings (details are checked in the service)
router.put('/',
  body().isObject().withMessage('Request body must be an object'),
  body('settings').optional().isObject().withMessage('settings must be an object'),
  validate,
  alertSettingsController.saveSettings
);

module.exports = router;
