/**
 * alertRecipientService.js
 * Who receives Email and SMS alerts for each threshold.
 * Communicates with backend endpoints at /api/v1/alert-recipients.
 */

import axiosInstance from './axiosInstance';

/**
 * Every threshold with its selected users
 * GET /api/v1/alert-recipients
 * → { data: [{ ThresholdId, EmailUserIds: [], SmsUserIds: [] }] }
 */
export const getAlertRecipients = async () => {
  const response = await axiosInstance.get('/alert-recipients');
  return response.data;
};

/**
 * Replace the recipients of one or more thresholds
 * PUT /api/v1/alert-recipients
 * @param {Array<{thresholdId:number, emailUserIds:number[], smsUserIds:number[]}>} items
 */
export const saveAlertRecipients = async (items) => {
  const response = await axiosInstance.put('/alert-recipients', { items });
  return response.data;
};

export default {
  getAlertRecipients,
  saveAlertRecipients,
};
