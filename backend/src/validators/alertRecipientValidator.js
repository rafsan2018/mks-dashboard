'use strict';

const { body } = require('express-validator');

const saveAlertRecipientsValidator = [
  body('items')
    .isArray({ min: 1, max: 500 }).withMessage('items must be a non-empty array'),

  body('items.*.thresholdId')
    .isInt({ min: 1 }).withMessage('thresholdId must be a positive integer'),

  body('items.*.emailUserIds')
    .isArray({ max: 500 }).withMessage('emailUserIds must be an array of user IDs'),

  body('items.*.emailUserIds.*')
    .isInt({ min: 1 }).withMessage('emailUserIds must contain positive integers'),

  body('items.*.smsUserIds')
    .isArray({ max: 500 }).withMessage('smsUserIds must be an array of user IDs'),

  body('items.*.smsUserIds.*')
    .isInt({ min: 1 }).withMessage('smsUserIds must contain positive integers'),
];

module.exports = { saveAlertRecipientsValidator };
