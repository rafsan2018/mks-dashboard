'use strict';

const { body, param } = require('express-validator');
const { ROLES } = require('../utils/constants');

const createUserValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 100 }).withMessage('Username must be 2-100 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, underscores, dots, and hyphens'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('phoneNumber')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number format'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(Object.values(ROLES)).withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  body('isActive')
    .optional()
    .isBoolean().withMessage('IsActive must be a boolean'),
];

const updateUserValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),

  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Username must be 2-100 characters')
    .matches(/^[a-zA-Z0-9_.\-\s]+$/).withMessage('Username can only contain letters, numbers, spaces, underscores, dots, and hyphens'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('phoneNumber')
    .optional({ nullable: true })
    .trim()
    .matches(/^\+?[\d\s\-().]{7,20}$/).withMessage('Invalid phone number format'),

  body('role')
    .optional()
    .isIn(Object.values(ROLES)).withMessage(`Role must be one of: ${Object.values(ROLES).join(', ')}`),

  body('isActive')
    .optional()
    .isBoolean().withMessage('IsActive must be a boolean'),
];

const userIdValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
];

module.exports = { createUserValidator, updateUserValidator, userIdValidator };
