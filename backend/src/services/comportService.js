'use strict';

const comportModel = require('../models/comportModel');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class ComportService {
  async getAllComports(query) {
    const { page = 1, limit = 20, protocol, search } = query;
    return comportModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      protocol: protocol || null,
      search: search || null,
    });
  }

  async getComportsList() {
    return comportModel.findAllList();
  }

  async getComportById(comportId) {
    const comport = await comportModel.findById(comportId);
    if (!comport) throw new NotFoundError('Comport');

    // Include linked devices
    comport.devices = await comportModel.getLinkedDevices(comportId);
    return comport;
  }

  async createComport(data) {
    if (await comportModel.portNameExists(data.portName)) {
      throw new ConflictError(`Port "${data.portName}" is already configured`);
    }
    const comport = await comportModel.create(data);
    logger.info(`Comport created: ${data.portName} [${data.protocol}]`);
    return comport;
  }

  async updateComport(comportId, updates) {
    const comport = await comportModel.findById(comportId);
    if (!comport) throw new NotFoundError('Comport');

    if (updates.portName && await comportModel.portNameExists(updates.portName, comportId)) {
      throw new ConflictError(`Port "${updates.portName}" is already configured`);
    }

    const updated = await comportModel.update(comportId, updates);
    logger.info(`Comport updated: ID ${comportId}`);
    return updated;
  }

  async deleteComport(comportId) {
    const comport = await comportModel.findById(comportId);
    if (!comport) throw new NotFoundError('Comport');

    const devices = await comportModel.getLinkedDevices(comportId);
    if (devices.length > 0) {
      const { ConflictError: CE } = require('../utils/errors');
      throw new CE(`Cannot delete comport. ${devices.length} device(s) are using this port.`);
    }

    await comportModel.delete(comportId);
    logger.info(`Comport deleted: ID ${comportId} - ${comport.PortName}`);
    return true;
  }
}

module.exports = new ComportService();
