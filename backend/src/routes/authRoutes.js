'use strict';

const router = require('express').Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authRateLimiter, testEmailRateLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const {
  signupValidator,
  loginValidator,
  changePasswordValidator,
  updateProfileValidator,
} = require('../validators/authValidator');

// POST /api/v1/auth/signup  - User registration
router.post('/signup',
  authRateLimiter,
  signupValidator,
  validate,
  authController.signup
);

// POST /api/v1/auth/register  - Alias for signup
router.post('/register',
  authRateLimiter,
  signupValidator,
  validate,
  authController.signup
);

// POST /api/v1/auth/login  - Direct credential authentication
router.post('/login',
  authRateLimiter,
  loginValidator,
  validate,
  authController.login
);

// POST /api/v1/auth/test-email - Send a test message to the selected profile email
router.post('/test-email',
  testEmailRateLimiter,
  body('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  validate,
  authController.sendTestEmail
);

// GET /api/v1/auth/profile/:userId  - Get profile by user ID
router.get('/profile/:userId',
  authController.getProfile
);

// PUT /api/v1/auth/profile/:userId  - Update user profile
router.put('/profile/:userId',
  updateProfileValidator,
  validate,
  authController.updateProfile
);

// PUT /api/v1/auth/profile  - Update user profile (with userId in body)
router.put('/profile',
  updateProfileValidator,
  validate,
  authController.updateProfile
);

// PUT /api/v1/auth/change-password  - Change user password
router.put('/change-password',
  changePasswordValidator,
  validate,
  authController.changePassword
);

// POST /api/v1/auth/logout  - End session
router.post('/logout',
  authController.logout
);

module.exports = router;
