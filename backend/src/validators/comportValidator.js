'use strict';

const { body, param } = require('express-validator');
const { COMPORT_PROTOCOLS, PARITY_OPTIONS } = require('../utils/constants');

const VALID_BAUD_RATES = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400];

const createComportValidator = [
  body('protocol')
    .notEmpty().withMessage('Protocol is required')
    .isIn(Object.values(COMPORT_PROTOCOLS))
    .withMessage(`Protocol must be one of: ${Object.values(COMPORT_PROTOCOLS).join(', ')}`),

  body('portName')
    .trim()
    .notEmpty().withMessage('Port name is required')
    .matches(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/)
    .withMessage('Invalid port name format (e.g., COM1, COM15, /dev/ttyUSB0)'),

  body('baudRate')
    .notEmpty().withMessage('Baud rate is required')
    .isInt().withMessage('Baud rate must be an integer')
    .custom((val) => {
      if (!VALID_BAUD_RATES.includes(parseInt(val))) {
        throw new Error(`Baud rate must be one of: ${VALID_BAUD_RATES.join(', ')}`);
      }
      return true;
    }),

  body('dataBits')
    .notEmpty().withMessage('Data bits is required')
    .isInt({ min: 5, max: 8 }).withMessage('Data bits must be between 5 and 8'),

  body('stopBits')
    .notEmpty().withMessage('Stop bits is required')
    .isIn([1, 2, '1', '2']).withMessage('Stop bits must be 1 or 2'),

  body('parity')
    .notEmpty().withMessage('Parity is required')
    .isIn(PARITY_OPTIONS).withMessage(`Parity must be one of: ${PARITY_OPTIONS.join(', ')}`),

  body('pollIntervalMs')
    .optional()
    .isInt({ min: 100, max: 60000 }).withMessage('Poll interval must be between 100ms and 60000ms'),
];

const updateComportValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Comport ID must be a positive integer'),

  body('protocol')
    .optional()
    .isIn(Object.values(COMPORT_PROTOCOLS))
    .withMessage(`Protocol must be one of: ${Object.values(COMPORT_PROTOCOLS).join(', ')}`),

  body('portName')
    .optional()
    .trim()
    .matches(/^(COM\d+|\/dev\/tty[A-Za-z0-9]+)$/)
    .withMessage('Invalid port name format'),

  body('baudRate')
    .optional()
    .isInt()
    .custom((val) => {
      if (val && !VALID_BAUD_RATES.includes(parseInt(val))) {
        throw new Error(`Baud rate must be one of: ${VALID_BAUD_RATES.join(', ')}`);
      }
      return true;
    }),

  body('dataBits')
    .optional()
    .isInt({ min: 5, max: 8 }).withMessage('Data bits must be between 5 and 8'),

  body('stopBits')
    .optional()
    .isIn([1, 2, '1', '2']).withMessage('Stop bits must be 1 or 2'),

  body('parity')
    .optional()
    .isIn(PARITY_OPTIONS).withMessage(`Parity must be one of: ${PARITY_OPTIONS.join(', ')}`),

  body('pollIntervalMs')
    .optional()
    .isInt({ min: 100, max: 60000 }).withMessage('Poll interval must be between 100ms and 60000ms'),
];

const comportIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('Comport ID must be a positive integer'),
];

module.exports = { createComportValidator, updateComportValidator, comportIdValidator };
