'use strict';

const deviceService = require('../services/deviceService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class DeviceController {
  async getAllDevices(req, res, next) {
    try {
      const result = await deviceService.getAllDevices(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Devices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getActiveDevices(req, res, next) {
    try {
      const devices = await deviceService.getActiveDevices();
      return successResponse(res, devices, 'Active devices retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDeviceById(req, res, next) {
    try {
      const device = await deviceService.getDeviceById(parseInt(req.params.id));
      return successResponse(res, device, 'Device retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createDevice(req, res, next) {
    try {
      const device = await deviceService.createDevice(req.body);
      return createdResponse(res, device, 'Device created successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateDevice(req, res, next) {
    try {
      const device = await deviceService.updateDevice(parseInt(req.params.id), req.body);
      return successResponse(res, device, 'Device updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleDeviceStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const device = await deviceService.toggleDeviceStatus(parseInt(req.params.id), isActive);
      return successResponse(res, device, `Device ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      await deviceService.deleteDevice(parseInt(req.params.id));
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();
