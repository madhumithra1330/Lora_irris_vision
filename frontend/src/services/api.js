import axios from 'axios';
import { loadSession, clearSession } from './storageService';

/**
 * Centralized Axios instance.
 * All API calls go through this — auth token is injected automatically.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attach Bearer token from IndexedDB session.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await loadSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // No session available — proceed without auth
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor — handle 401 (expired/invalid session).
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearSession();
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
