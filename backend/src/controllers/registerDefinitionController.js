'use strict';

const registerDefinitionService = require('../services/registerDefinitionService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class RegisterDefinitionController {
  async getAllRegisters(req, res, next) {
    try {
      const result = await registerDefinitionService.getAllRegisters(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Register definitions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRegisterById(req, res, next) {
    try {
      const register = await registerDefinitionService.getRegisterById(parseInt(req.params.id));
      return successResponse(res, register, 'Register definition retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRegistersByDevice(req, res, next) {
    try {
      const registers = await registerDefinitionService.getRegistersByDevice(parseInt(req.params.deviceId));
      return successResponse(res, registers, 'Device register definitions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createRegister(req, res, next) {
    try {
      const register = await registerDefinitionService.createRegister(req.body);
      return createdResponse(res, register, 'Register definition created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateRegister(req, res, next) {
    try {
      const register = await registerDefinitionService.updateRegister(parseInt(req.params.id), req.body);
      return successResponse(res, register, 'Register definition updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteRegister(req, res, next) {
    try {
      await registerDefinitionService.deleteRegister(parseInt(req.params.id));
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateRegisters(req, res, next) {
    try {
      const { deviceId } = req.params;
      const count = await registerDefinitionService.bulkCreateRegisters(parseInt(deviceId), req.body);
      return createdResponse(res, { insertedCount: count }, `${count} register definitions created`);
    } catch (error) {
      next(error);
    }
  }

  async getDataTypes(req, res, next) {
    try {
      const types = await registerDefinitionService.getDataTypes();
      return successResponse(res, types, 'Data types retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RegisterDefinitionController();
