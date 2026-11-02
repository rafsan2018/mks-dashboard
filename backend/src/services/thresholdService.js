'use strict';

const thresholdModel = require('../models/thresholdModel');
const registerDefinitionModel = require('../models/registerDefinitionModel');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { logger } = require('../utils/logger');

class ThresholdService {
  /**
   * Get all thresholds with pagination and filtering
   */
  async getAllThresholds(query) {
    const { page = 1, limit = 20, registerId, deviceId, severity, isActive, search } = query;
    return thresholdModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      registerId: registerId ? parseInt(registerId) : null,
      deviceId: deviceId ? parseInt(deviceId) : null,
      severity: severity || null,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === '1' : undefined,
      search: search || null,
    });
  }

  /**
   * Get threshold by ID
   */
  async getThresholdById(thresholdId) {
    const threshold = await thresholdModel.findById(thresholdId);
    if (!threshold) throw new NotFoundError('Threshold');
    return threshold;
  }

  /**
   * Get thresholds for a specific register
   */
  async getThresholdsByRegister(registerId) {
    const register = await registerDefinitionModel.findById(registerId);
    if (!register) throw new NotFoundError('Register definition');
    return thresholdModel.findByRegisterId(registerId);
  }

  /**
   * Create a new threshold
   */
  async createThreshold(data) {
    const register = await registerDefinitionModel.findById(data.registerId);
    if (!register) throw new NotFoundError('Register definition');

    // Optional validation: check if min and max are logically valid if both provided
    if (data.minValue !== undefined && data.minValue !== null &&
        data.maxValue !== undefined && data.maxValue !== null) {
      if (parseFloat(data.minValue) > parseFloat(data.maxValue)) {
        throw new ValidationError('MinValue cannot be greater than MaxValue');
      }
    }

    const threshold = await thresholdModel.create(data);
    logger.info(`Threshold created for register ${data.registerId} [Severity: ${data.severity || 'Warning'}]`);
    return threshold;
  }

  /**
   * Update an existing threshold
   */
  async updateThreshold(thresholdId, updates) {
    const threshold = await thresholdModel.findById(thresholdId);
    if (!threshold) throw new NotFoundError('Threshold');

    if (updates.registerId) {
      const register = await registerDefinitionModel.findById(updates.registerId);
      if (!register) throw new NotFoundError('Register definition');
    }

    const effectiveMin = updates.minValue !== undefined ? updates.minValue : threshold.MinValue;
    const effectiveMax = updates.maxValue !== undefined ? updates.maxValue : threshold.MaxValue;

    if (effectiveMin !== null && effectiveMax !== null) {
      if (parseFloat(effectiveMin) > parseFloat(effectiveMax)) {
        throw new ValidationError('MinValue cannot be greater than MaxValue');
      }
    }

    const updated = await thresholdModel.update(thresholdId, updates);
    logger.info(`Threshold updated: ID ${thresholdId}`);
    return updated;
  }

  /**
   * Toggle threshold active status
   */
  async toggleThresholdStatus(thresholdId, isActive) {
    const threshold = await thresholdModel.findById(thresholdId);
    if (!threshold) throw new NotFoundError('Threshold');

    const updated = await thresholdModel.toggleActive(thresholdId, isActive);
    logger.info(`Threshold ${thresholdId} status set to ${isActive ? 'active' : 'inactive'}`);
    return updated;
  }

  /**
   * Delete threshold
   */
  async deleteThreshold(thresholdId) {
    const threshold = await thresholdModel.findById(thresholdId);
    if (!threshold) throw new NotFoundError('Threshold');

    await thresholdModel.delete(thresholdId);
    logger.info(`Threshold deleted: ID ${thresholdId}`);
    return true;
  }
}

module.exports = new ThresholdService();
