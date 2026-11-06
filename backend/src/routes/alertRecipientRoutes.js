'use strict';

const router = require('express').Router();
const alertRecipientController = require('../controllers/alertRecipientController');
const { validate } = require('../middleware/validate');
const { saveAlertRecipientsValidator } = require('../validators/alertRecipientValidator');

// GET /api/v1/alert-recipients  - Email and SMS recipients of every threshold
router.get('/', alertRecipientController.getAllRecipients);

// PUT /api/v1/alert-recipients  - Replace the recipients of one or more thresholds
router.put('/',
  saveAlertRecipientsValidator,
  validate,
  alertRecipientController.saveRecipients
);

module.exports = router;
