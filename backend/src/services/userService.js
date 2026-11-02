'use strict';

const userModel = require('../models/userModel');
const authService = require('./authService');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class UserService {
  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(query) {
    const { page = 1, limit = 20, role, isActive, search } = query;
    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      role: role || null,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
      search: search || null,
    };
    return userModel.findAll(filters);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await userModel.findById(userId);
    if (!user) throw new NotFoundError('User');
    return user;
  }

  /**
   * Create new user (admin only)
   */
  async createUser({ username, password, email, phoneNumber, role, isActive }) {
    // Check username uniqueness
    if (await userModel.usernameExists(username)) {
      throw new ConflictError(`Username "${username}" is already taken`);
    }

    // Check email uniqueness
    if (email && await userModel.emailExists(email)) {
      throw new ConflictError(`Email "${email}" is already registered`);
    }

    const hashedPassword = await authService.hashPassword(password);

    const user = await userModel.create({
      username,
      password: hashedPassword,
      email: email || null,
      phoneNumber: phoneNumber || null,
      role,
      isActive: isActive !== undefined ? isActive : 1,
    });

    logger.info(`New user created: ${username} [${role}]`);
    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId, updates, requestingUserId) {
    const user = await userModel.findById(userId);
    if (!user) throw new NotFoundError('User');

    // Check username uniqueness if being updated
    if (updates.username && updates.username !== user.Username && await userModel.usernameExists(updates.username, userId)) {
      throw new ConflictError(`Username "${updates.username}" is already taken`);
    }

    // Check email uniqueness if being updated
    if (updates.email && updates.email !== user.Email && await userModel.emailExists(updates.email, userId)) {
      throw new ConflictError(`Email "${updates.email}" is already registered`);
    }

    const updated = await userModel.update(userId, {
      username: updates.username,
      email: updates.email,
      phoneNumber: updates.phoneNumber,
      role: updates.role,
      isActive: updates.isActive,
    });

    logger.info(`User updated: ID ${userId} by user ID ${requestingUserId}`);
    return updated;
  }

  /**
   * Delete user
   */
  async deleteUser(userId, requestingUserId) {
    if (userId === requestingUserId) {
      const { ForbiddenError } = require('../utils/errors');
      throw new ForbiddenError('You cannot delete your own account');
    }

    const user = await userModel.findById(userId);
    if (!user) throw new NotFoundError('User');

    await userModel.delete(userId);
    logger.info(`User deleted: ID ${userId} by user ID ${requestingUserId}`);
    return true;
  }
}

module.exports = new UserService();
