/**
 * authService.js
 * Frontend API client for Authentication (Login, Register/Signup, Logout).
 * Communicates with backend endpoints at /api/v1/auth/*.
 */

import axiosInstance from './axiosInstance';

/**
 * Log in with username (or email) and password
 * POST /api/v1/auth/login
 */
export const login = async (credentials) => {
  const response = await axiosInstance.post('/auth/login', credentials);
  if (response.data?.data?.user) {
    localStorage.setItem('authUser', JSON.stringify(response.data.data.user));
    localStorage.removeItem('authToken');
  }
  return response.data;
};

/**
 * Register a new user account
 * POST /api/v1/auth/signup
 */
export const signup = async (userData) => {
  const response = await axiosInstance.post('/auth/signup', userData);
  return response.data;
};

/**
 * Get profile for user
 * GET /api/v1/auth/profile/:userId
 */
export const getProfile = async (userId) => {
  const response = await axiosInstance.get(`/auth/profile/${userId}`);
  return response.data;
};

/**
 * Send a test email to the current profile email.
 */
export const sendTestEmail = async () => {
  const user = getCurrentUser();
  if (!user?.UserId) {
    throw new Error('Your profile could not be identified. Please log in again.');
  }
  const response = await axiosInstance.post('/auth/test-email', { userId: user.UserId });
  return response.data;
};

/**
 * Update user profile (Name, Email, Phone)
 * PUT /api/v1/auth/profile/:userId
 */
export const updateProfile = async (userId, profileData) => {
  const response = await axiosInstance.put(`/auth/profile/${userId}`, profileData);
  if (response.data?.data) {
    const current = getCurrentUser() || {};
    const updated = { ...current, ...response.data.data };
    localStorage.setItem('authUser', JSON.stringify(updated));
    window.dispatchEvent(new Event('auth-user-updated'));
  }
  return response.data;
};

/**
 * Change user password
 * PUT /api/v1/auth/change-password
 */
export const changePassword = async (payload) => {
  const response = await axiosInstance.put('/auth/change-password', payload);
  return response.data;
};

/**
 * End session / log out
 */
export const logout = async () => {
  try {
    await axiosInstance.post('/auth/logout');
  } catch (err) {
    // Continue with local cleanup even if network request fails
    console.warn('Logout endpoint call failed:', err);
  } finally {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  }
};

/**
 * Get current stored user
 */
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default {
  login,
  signup,
  getProfile,
  sendTestEmail,
  updateProfile,
  changePassword,
  logout,
  getCurrentUser,
};
