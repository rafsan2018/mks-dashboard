/**
 * thresholdService.js
 * Central API service for Threshold Alerts Configuration.
 * Communicates with backend endpoints at /api/v1/thresholds and /api/v1/registers.
 */

import axiosInstance from './axiosInstance';

/**
 * Fetch all thresholds from backend API
 * GET /api/v1/thresholds
 */
export const getThresholds = async (params = {}) => {
  const response = await axiosInstance.get('/thresholds', {
    params: { limit: 100, ...params },
  });
  return response.data;
};

/**
 * Fetch a single threshold by ID
 * GET /api/v1/thresholds/:id
 */
export const getThresholdById = async (id) => {
  const response = await axiosInstance.get(`/thresholds/${id}`);
  return response.data;
};

/**
 * Create a new threshold rule
 * POST /api/v1/thresholds
 */
export const createThreshold = async (payload) => {
  const response = await axiosInstance.post('/thresholds', payload);
  return response.data;
};

/**
 * Update an existing threshold rule
 * PUT /api/v1/thresholds/:id
 */
export const updateThreshold = async (id, payload) => {
  const response = await axiosInstance.put(`/thresholds/${id}`, payload);
  return response.data;
};

/**
 * Toggle threshold active status
 * PATCH /api/v1/thresholds/:id/status
 */
export const toggleThresholdStatus = async (id, isActive) => {
  const response = await axiosInstance.patch(`/thresholds/${id}/status`, { isActive });
  return response.data;
};

/**
 * Delete a threshold rule
 * DELETE /api/v1/thresholds/:id
 */
export const deleteThreshold = async (id) => {
  const response = await axiosInstance.delete(`/thresholds/${id}`);
  return response.data;
};

/**
 * Fetch all register definitions from backend
 * GET /api/v1/registers
 */
export const getRegisterDefinitions = async (params = {}) => {
  const response = await axiosInstance.get('/registers', {
    params: { limit: 100, ...params },
  });
  return response.data;
};

export default {
  getThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  toggleThresholdStatus,
  deleteThreshold,
  getRegisterDefinitions,
};
