'use strict';

const comportService = require('../services/comportService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class ComportController {
  async getAllComports(req, res, next) {
    try {
      const result = await comportService.getAllComports(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Comports retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getComportsList(req, res, next) {
    try {
      const comports = await comportService.getComportsList();
      return successResponse(res, comports, 'Comports list retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getComportById(req, res, next) {
    try {
      const comport = await comportService.getComportById(parseInt(req.params.id));
      return successResponse(res, comport, 'Comport retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createComport(req, res, next) {
    try {
      const comport = await comportService.createComport(req.body);
      return createdResponse(res, comport, 'Comport created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateComport(req, res, next) {
    try {
      const comport = await comportService.updateComport(parseInt(req.params.id), req.body);
      return successResponse(res, comport, 'Comport updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteComport(req, res, next) {
    try {
      await comportService.deleteComport(parseInt(req.params.id));
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComportController();
