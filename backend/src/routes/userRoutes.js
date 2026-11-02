'use strict';

const router = require('express').Router();
const userController = require('../controllers/userController');
const { validate } = require('../middleware/validate');
const { createUserValidator, updateUserValidator, userIdValidator } = require('../validators/userValidator');

// GET /api/v1/users  - List all users
router.get('/', userController.getAllUsers);

// GET /api/v1/users/:id  - Get user by ID
router.get('/:id(\\d+)', userIdValidator, validate, userController.getUserById);

// POST /api/v1/users  - Create new user
router.post('/', createUserValidator, validate, userController.createUser);

// PUT /api/v1/users/:id  - Update user
router.put('/:id(\\d+)', updateUserValidator, validate, userController.updateUser);

// DELETE /api/v1/users/:id  - Delete user
router.delete('/:id(\\d+)', userIdValidator, validate, userController.deleteUser);

module.exports = router;
