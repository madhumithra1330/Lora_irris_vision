import api from './api';
import { saveSession, loadSession, clearSession } from './storageService';

/**
 * Send OTP to phone number.
 */
export async function sendOtp(phone) {
  const { data } = await api.post('/api/auth/send-otp', { phone });
  return data;
}

/**
 * Verify OTP and get session.
 * Stores session in IndexedDB on success.
 */
export async function verifyOtp(phone, token) {
  const { data } = await api.post('/api/auth/verify-otp', { phone, token });

  // Store session in IndexedDB
  if (data.data?.session) {
    await saveSession(data.data.session);
  }

  return data.data; // { session, user, profile, isNewUser }
}

/**
 * Get current user profile.
 */
export async function getProfile() {
  const { data } = await api.get('/api/auth/me');
  return data.data; // profile object
}

/**
 * Create or update user profile.
 */
export async function updateProfile(profileData) {
  const { data } = await api.post('/api/auth/profile', profileData);
  return data.data; // updated profile
}

/**
 * Validate stored session by calling /me.
 * Returns profile if valid, null if invalid.
 */
export async function validateSession() {
  const session = await loadSession();
  if (!session?.access_token) return null;

  try {
    const profile = await getProfile();
    return profile;
  } catch {
    await clearSession();
    return null;
  }
}

/**
 * Logout — clear all stored data.
 */
export async function logout() {
  await clearSession();
}

export { loadSession, saveSession, clearSession };
