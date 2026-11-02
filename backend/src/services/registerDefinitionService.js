'use strict';

const registerDefinitionModel = require('../models/registerDefinitionModel');
const deviceModel = require('../models/deviceModel');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class RegisterDefinitionService {
  async getAllRegisters(query) {
    const { page = 1, limit = 20, deviceId, action, dataType, functionCode, search } = query;
    return registerDefinitionModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      deviceId: deviceId ? parseInt(deviceId) : null,
      action: action || null,
      dataType: dataType || null,
      functionCode: functionCode ? parseInt(functionCode) : null,
      search: search || null,
    });
  }

  async getRegisterById(registerId) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');
    return register;
  }

  async getRegistersByDevice(deviceId) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');
    return registerDefinitionModel.findByDeviceId(deviceId);
  }

  async createRegister(data) {
    // Verify device exists
    const device = await deviceModel.findById(data.deviceId);
    if (!device) throw new NotFoundError('Device');

    const register = await registerDefinitionModel.create(data);
    logger.info(`Register definition created: ${data.registerName} for device ${data.deviceId}`);
    return register;
  }

  async updateRegister(registerId, updates) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');

    const updated = await registerDefinitionModel.update(registerId, updates);
    logger.info(`Register definition updated: ID ${registerId}`);
    return updated;
  }

  async deleteRegister(registerId) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');

    await registerDefinitionModel.delete(registerId);
    logger.info(`Register definition deleted: ID ${registerId}`);
    return true;
  }

  async bulkCreateRegisters(deviceId, registers) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    const preparedRegisters = registers.map(r => ({ ...r, deviceId }));
    const count = await registerDefinitionModel.bulkCreate(preparedRegisters);
    logger.info(`Bulk created ${count} register definitions for device ${deviceId}`);
    return count;
  }

  async getDataTypes() {
    return registerDefinitionModel.getDistinctDataTypes();
  }
}

module.exports = new RegisterDefinitionService();
