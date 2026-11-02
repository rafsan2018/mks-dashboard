'use strict';

const { body } = require('express-validator');
const { ROLES } = require('../utils/constants');

const signupValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 100 }).withMessage('Username must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores and hyphens'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phoneNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Phone number must not exceed 30 characters'),

  body('role')
    .optional()
    .isIn([ROLES.ADMIN, ROLES.OPERATOR, ROLES.VIEWER])
    .withMessage(`Role must be one of: ${ROLES.ADMIN}, ${ROLES.OPERATOR}, ${ROLES.VIEWER}`),
];

const loginValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 100 }).withMessage('Username must be between 2 and 100 characters'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),

  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const updateProfileValidator = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9_.\-\s]+$/).withMessage('Name can only contain letters, numbers, spaces, underscores, dots, and hyphens'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phoneNumber')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 30 }).withMessage('Phone number must not exceed 30 characters'),
];

module.exports = { signupValidator, loginValidator, changePasswordValidator, updateProfileValidator };
