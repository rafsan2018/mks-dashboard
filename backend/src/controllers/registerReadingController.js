'use strict';

const registerReadingService = require('../services/registerReadingService');
const { successResponse, createdResponse, noContentResponse, paginatedResponse } = require('../utils/apiResponse');

class RegisterReadingController {
  async getReadings(req, res, next) {
    try {
      const result = await registerReadingService.getReadings(req.query);
      return paginatedResponse(res, result.data, result.pagination, 'Readings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getReadingById(req, res, next) {
    try {
      const reading = await registerReadingService.getReadingById(parseInt(req.params.id));
      return successResponse(res, reading, 'Reading retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getByDevice(req, res, next) {
    try {
      const deviceReadings = await registerReadingService.getByDevice(parseInt(req.params.deviceId));
      return successResponse(res, deviceReadings, 'Device readings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getLatestByRegister(req, res, next) {
    try {
      const reading = await registerReadingService.getLatestByRegister(parseInt(req.params.registerId));
      return successResponse(res, reading, 'Latest reading retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTimeSeries(req, res, next) {
    try {
      const { registerId } = req.params;
      const { timeRange = '24h' } = req.query;
      const result = await registerReadingService.getTimeSeries(parseInt(registerId), timeRange);
      return successResponse(res, result, 'Time series data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDevicePowerTrends(req, res, next) {
    try {
      const deviceId = parseInt(req.params.deviceId, 10);
      const { timeRange = '30d', format = 'json' } = req.query;
      const result = await registerReadingService.getDevicePowerTrends(deviceId, timeRange);

      if (format === 'csv') {
        const csv = registerReadingService.convertPowerTrendsToCsv(result);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="DPM_Power_Trends_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.status(200).send('\uFEFF' + csv);
      }

      return successResponse(res, result, 'Device power trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const { registerId } = req.params;
      const { timeRange = '24h' } = req.query;
      const result = await registerReadingService.getStats(parseInt(registerId), timeRange);
      return successResponse(res, result, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req, res, next) {
    try {
      const dashboard = await registerReadingService.getDashboard();
      return successResponse(res, dashboard, 'Dashboard data retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createReading(req, res, next) {
    try {
      const reading = await registerReadingService.createReading(req.body, Number(req.get('x-user-id')));
      return createdResponse(res, reading, 'Reading created successfully');
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateReadings(req, res, next) {
    try {
      const result = await registerReadingService.bulkCreateReadings(req.body, Number(req.get('x-user-id')));
      return createdResponse(res, result, `${result.insertedCount} readings inserted successfully`);
    } catch (error) {
      next(error);
    }
  }

  async deleteReading(req, res, next) {
    try {
      await registerReadingService.deleteReading(parseInt(req.params.id));
      return noContentResponse(res);
    } catch (error) {
      next(error);
    }
  }

  async purgeOldReadings(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 90;
      const result = await registerReadingService.purgeOldReadings(days);
      return successResponse(res, result, `Purged readings older than ${days} days`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RegisterReadingController();
