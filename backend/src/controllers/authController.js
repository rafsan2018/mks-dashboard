'use strict';

const authService = require('../services/authService');
const { successResponse, createdResponse } = require('../utils/apiResponse');

class AuthController {
  /**
   * User Signup / Registration
   * POST /api/v1/auth/signup
   */
  async signup(req, res, next) {
    try {
      const user = await authService.signup(req.body);
      return createdResponse(res, user, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Login
   * POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      return successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async sendTestEmail(req, res, next) {
    try {
      const result = await authService.sendTestEmail(Number(req.body.userId));
      return successResponse(res, result, 'Test email sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get User Profile
   * GET /api/v1/auth/profile/:userId
   */
  async getProfile(req, res, next) {
    try {
      const userId = parseInt(req.params.userId || req.query.userId);
      const user = await authService.getProfile(userId);
      return successResponse(res, user, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update User Profile
   * PUT /api/v1/auth/profile/:userId
   */
  async updateProfile(req, res, next) {
    try {
      const userId = parseInt(req.params.userId || req.body.userId);
      const updatedUser = await authService.updateProfile(userId, req.body);
      return successResponse(res, updatedUser, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change Password
   * PUT /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(parseInt(userId), currentPassword, newPassword);
      return successResponse(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * User Logout
   * POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
