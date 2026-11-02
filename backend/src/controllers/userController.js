'use strict';

const userService = require('../services/userService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const result = await userService.getAllUsers(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserById(parseInt(req.params.id));
      return successResponse(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      return createdResponse(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const requestingUserId = req.user?.UserId || req.body.requestingUserId || null;
      const user = await userService.updateUser(
        parseInt(req.params.id),
        req.body,
        requestingUserId
      );
      return successResponse(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const requestingUserId = req.user?.UserId || req.body.requestingUserId || null;
      await userService.deleteUser(parseInt(req.params.id), requestingUserId);
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
