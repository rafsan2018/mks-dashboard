/**
 * alertSettingsService.js
 * SMS settings, the "genset started" recipients and the SMS log.
 * Communicates with backend endpoints at /api/v1/alert-settings and /api/v1/sms-log.
 */

import axiosInstance from './axiosInstance';

/**
 * SMS settings, genset-start recipients and the rules the page shows
 * GET /api/v1/alert-settings
 * → { data: { settings: {...}, gensetStartUserIds: [], rules: {...} } }
 */
export const getAlertSettings = async () => {
  const response = await axiosInstance.get('/alert-settings');
  return response.data;
};

/**
 * Save any of the settings and/or the genset-start recipients
 * PUT /api/v1/alert-settings
 * @param {{settings?: object, gensetStartUserIds?: number[]}} payload
 */
export const saveAlertSettings = async (payload) => {
  const response = await axiosInstance.put('/alert-settings', payload);
  return response.data;
};

/**
 * Newest SMS first
 * GET /api/v1/sms-log?limit=100&status=FAILED
 * → { data: { rows: [{ AlertId, ThresholdId, Recipient, Message, Status, SentAt, RegisterName }], last7Days: { SENT, FAILED } } }
 */
export const getSmsLog = async (params = {}) => {
  const response = await axiosInstance.get('/sms-log', { params });
  return response.data;
};

export default {
  getAlertSettings,
  saveAlertSettings,
  getSmsLog,
};
