/**
 * userService.js
 * Frontend API client for User Management.
 * Communicates with backend endpoints at /api/v1/users/*.
 */

import axiosInstance from './axiosInstance';

/**
 * Fetch all users with optional filters (role, isActive, search, page, limit)
 * GET /api/v1/users
 */
export const getUsers = async (params = {}) => {
  const response = await axiosInstance.get('/users', {
    params: { limit: 100, ...params },
  });
  return response.data;
};

/**
 * Fetch a single user by ID
 * GET /api/v1/users/:id
 */
export const getUserById = async (id) => {
  const response = await axiosInstance.get(`/users/${id}`);
  return response.data;
};

/**
 * Create a new user account
 * POST /api/v1/users
 */
export const createUser = async (userData) => {
  const response = await axiosInstance.post('/users', userData);
  return response.data;
};

/**
 * Update an existing user
 * PUT /api/v1/users/:id
 */
export const updateUser = async (id, userData) => {
  const response = await axiosInstance.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Delete a user by ID
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (id) => {
  const response = await axiosInstance.delete(`/users/${id}`);
  return response.data;
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
