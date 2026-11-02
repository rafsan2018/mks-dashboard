'use strict';

const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const emailService = require('./emailService');
const { UnauthorizedError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class AuthService {
  /**
   * Register a new user (Signup)
   * Hashes password and persists user directly in the database
   */
  async signup({ username, password, email = null, phoneNumber = null, role = 'Viewer' }) {
    // Check if username already exists
    if (await userModel.usernameExists(username)) {
      throw new ConflictError(`Username "${username}" is already taken`);
    }

    // Check if email already exists
    if (email && await userModel.emailExists(email)) {
      throw new ConflictError(`Email "${email}" is already registered`);
    }

    // Securely hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user in database
    const user = await userModel.create({
      username,
      password: hashedPassword,
      email: email || null,
      phoneNumber: phoneNumber || null,
      role: role || 'Viewer',
      isActive: 1,
    });

    logger.info(`User signed up successfully: ${username} [${role || 'Viewer'}]`);

    return user;
  }

  /**
   * Authenticate user with credentials (Login)
   * Verifies username and hashed password directly without tokens
   */
  async login(username, password) {
    let user = await userModel.findByUsername(username);
    if (!user && username.includes('@')) {
      user = await userModel.findByEmailWithPassword(username);
    }
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (!user.IsActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact administrator.');
    }

    // Verify hashed password
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    // Update last login timestamp
    await userModel.updateLastLogin(user.UserId);

    logger.info(`User logged in successfully: ${user.Username} [${user.Role}]`);

    // Return user details without password
    const { Password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userModel.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const isValid = await bcrypt.compare(currentPassword, user.Password);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await userModel.update(userId, { password: hashedPassword });

    logger.info(`Password updated for user ID: ${userId}`);
    return { message: 'Password changed successfully' };
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async sendTestEmail(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (!user.Email) {
      throw new ValidationError('Add an email address to your profile before sending a test email');
    }

    await emailService.sendTestEmail({
      recipient: user.Email,
      username: user.Username,
    });
    logger.info(`Test email sent to profile email for user ID ${userId}`);
    return { recipient: user.Email };
  }

  /**
   * Update user profile (Name/Username, Email, Phone Number)
   */
  async updateProfile(userId, { username, email, phoneNumber }) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    const updates = {};

    if (username !== undefined && username.trim() !== '') {
      const trimmedUsername = username.trim();
      if (trimmedUsername !== user.Username && await userModel.usernameExists(trimmedUsername, userId)) {
        throw new ConflictError(`Username "${trimmedUsername}" is already taken`);
      }
      updates.username = trimmedUsername;
    }

    if (email !== undefined) {
      const trimmedEmail = email ? email.trim() : null;
      if (trimmedEmail && trimmedEmail !== user.Email && await userModel.emailExists(trimmedEmail, userId)) {
        throw new ConflictError(`Email "${trimmedEmail}" is already registered`);
      }
      updates.email = trimmedEmail;
    }

    if (phoneNumber !== undefined) {
      updates.phoneNumber = phoneNumber ? phoneNumber.trim() : null;
    }

    const updatedUser = await userModel.update(userId, updates);
    logger.info(`Profile updated for user ID: ${userId} (${updatedUser.Username})`);

    return updatedUser;
  }

  /**
   * Hash a plaintext password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }
}

module.exports = new AuthService();
