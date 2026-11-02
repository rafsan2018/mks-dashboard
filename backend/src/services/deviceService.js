'use strict';

const deviceModel = require('../models/deviceModel');
const comportModel = require('../models/comportModel');
const { NotFoundError, ConflictError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class DeviceService {
  /**
   * Get all devices with pagination and filters
   */
  async getAllDevices(query) {
    const { page = 1, limit = 20, isActive, search, comportId } = query;
    return deviceModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
      search: search || null,
      comportId: comportId ? parseInt(comportId) : null,
    });
  }

  /**
   * Get active devices list (for dropdowns)
   */
  async getActiveDevices() {
    return deviceModel.findAllActive();
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    // Add register count
    device.registerCount = await deviceModel.getRegisterCount(deviceId);
    return device;
  }

  /**
   * Create new device
   */
  async createDevice(data) {
    // Verify comport exists
    const comport = await comportModel.findById(data.comportId);
    if (!comport) throw new NotFoundError('Comport');

    // Check slave address uniqueness within the same comport
    if (await deviceModel.slaveAddressExists(data.comportId, data.slaveAddress)) {
      throw new ConflictError(
        `Slave address ${data.slaveAddress} is already used on comport ${comport.PortName}`
      );
    }

    const device = await deviceModel.create(data);
    logger.info(`Device created: ${data.deviceName} [${data.deviceModel}]`);
    return device;
  }

  /**
   * Update device
   */
  async updateDevice(deviceId, updates) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    // If comportId or slaveAddress is being changed, check uniqueness
    const newComportId = updates.comportId || device.ComportId;
    const newSlaveAddress = updates.slaveAddress || device.SlaveAddress;

    if (updates.comportId || updates.slaveAddress) {
      if (await deviceModel.slaveAddressExists(newComportId, newSlaveAddress, deviceId)) {
        throw new ConflictError(`Slave address ${newSlaveAddress} is already used on this comport`);
      }
    }

    const updated = await deviceModel.update(deviceId, updates);
    logger.info(`Device updated: ID ${deviceId}`);
    return updated;
  }

  /**
   * Toggle device active status
   */
  async toggleDeviceStatus(deviceId, isActive) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    const updated = await deviceModel.toggleActive(deviceId, isActive);
    logger.info(`Device ${deviceId} status set to ${isActive ? 'active' : 'inactive'}`);
    return updated;
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId) {
    const device = await deviceModel.findById(deviceId);
    if (!device) throw new NotFoundError('Device');

    await deviceModel.delete(deviceId);
    logger.info(`Device deleted: ID ${deviceId} - ${device.DeviceName}`);
    return true;
  }
}

module.exports = new DeviceService();
