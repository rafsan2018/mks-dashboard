'use strict';

const alertRecipientService = require('../services/alertRecipientService');
const { successResponse } = require('../utils/apiResponse');

class AlertRecipientController {
  async getAllRecipients(req, res, next) {
    try {
      const data = await alertRecipientService.getAllRecipients();
      return successResponse(res, data, 'Alert recipients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async saveRecipients(req, res, next) {
    try {
      const data = await alertRecipientService.saveRecipients(req.body.items);
      const count = req.body.items.length;
      return successResponse(res, data, `Alert recipients saved for ${count} threshold${count === 1 ? '' : 's'}`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AlertRecipientController();
