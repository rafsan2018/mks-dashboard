/**
 * axiosInstance.js
 * Centralised Axios client for all backend API calls.
 * Base URL → http://localhost:5000/api/v1  (backend dev server)
 */

import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const API_BASE_URL = 'https://mks-api.elliancesystem.com/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Global Loading State Tracker ─────────────────────────────
let activeRequests = 0;
const listeners = new Set();

const notifyListeners = () => {
  const isLoading = activeRequests > 0;
  listeners.forEach((listener) => {
    try {
      listener(isLoading, activeRequests);
    } catch (err) {
      console.error('[axiosInstance] Loading listener error:', err);
    }
  });
};

/**
 * Subscribe to global loading state changes.
 * Returns an unsubscribe cleanup function.
 */
export const subscribeLoading = (listener) => {
  listeners.add(listener);
  // Emit current state immediately to caller
  listener(activeRequests > 0, activeRequests);
  return () => {
    listeners.delete(listener);
  };
};

export const getActiveRequests = () => activeRequests;

// ── Request interceptor ──────────────────────────────────────
// Track active requests; this application does not use bearer tokens.
axiosInstance.interceptors.request.use(
  (config) => {
    if (!config?.skipLoading) {
      activeRequests++;
      notifyListeners();
    }
    return config;
  },
  (error) => {
    if (!error?.config?.skipLoading) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyListeners();
    }
    return Promise.reject(error);
  }
);

// ── Response interceptor ─────────────────────────────────────
// Automatically clear loading on response or error
axiosInstance.interceptors.response.use(
  (response) => {
    if (!response?.config?.skipLoading) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyListeners();
    }
    return response;
  },
  (error) => {
    if (!error?.config?.skipLoading) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyListeners();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
