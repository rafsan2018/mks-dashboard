'use strict';

const alertSettingsService = require('../services/alertSettingsService');
const { successResponse } = require('../utils/apiResponse');

class AlertSettingsController {
  async getSettings(req, res, next) {
    try {
      return successResponse(res, await alertSettingsService.getSettings(), 'SMS settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async saveSettings(req, res, next) {
    try {
      return successResponse(res, await alertSettingsService.saveSettings(req.body), 'SMS settings saved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlertSettingsController();
