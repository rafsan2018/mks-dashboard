'use strict';

const thresholdService = require('../services/thresholdService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class ThresholdController {
  async getAllThresholds(req, res, next) {
    try {
      const result = await thresholdService.getAllThresholds(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Thresholds retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getThresholdById(req, res, next) {
    try {
      const threshold = await thresholdService.getThresholdById(parseInt(req.params.id));
      return successResponse(res, threshold, 'Threshold retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getThresholdsByRegister(req, res, next) {
    try {
      const thresholds = await thresholdService.getThresholdsByRegister(parseInt(req.params.registerId));
      return successResponse(res, thresholds, 'Register thresholds retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createThreshold(req, res, next) {
    try {
      const threshold = await thresholdService.createThreshold(req.body);
      return createdResponse(res, threshold, 'Threshold created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateThreshold(req, res, next) {
    try {
      const threshold = await thresholdService.updateThreshold(parseInt(req.params.id), req.body);
      return successResponse(res, threshold, 'Threshold updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleThresholdStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const threshold = await thresholdService.toggleThresholdStatus(parseInt(req.params.id), isActive);
      return successResponse(res, threshold, `Threshold ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async deleteThreshold(req, res, next) {
    try {
      await thresholdService.deleteThreshold(parseInt(req.params.id));
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ThresholdController();
