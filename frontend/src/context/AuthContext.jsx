import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import * as demoService from '../services/demoService';
import { clear as clearStorage } from '../services/storageService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        if (demoService.isDemoMode()) {
          setProfile(demoService.generateProfile());
          setUser({ id: 'demo-user-uuid', phone: '+919876543210' });
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        const savedProfile = await authService.validateSession();
        if (savedProfile) {
          setProfile(savedProfile);
          setUser({ id: savedProfile.id, phone: savedProfile.phone });
          setIsAuthenticated(true);
        }
      } catch {
        // Invalid session — remain unauthenticated
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const sendOtp = useCallback(async (phone) => {
    return await authService.sendOtp(phone);
  }, []);

  const login = useCallback(async (phone, otp) => {
    const result = await authService.verifyOtp(phone, otp);
    setUser(result.user);
    setProfile(result.profile);
    setIsNewUser(result.isNewUser);
    setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    await clearStorage();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setIsNewUser(false);
  }, []);

  const updateProfile = useCallback(async (data) => {
    if (demoService.isDemoMode()) {
      setProfile((prev) => ({ ...prev, ...data }));
      return { ...profile, ...data };
    }
    const updated = await authService.updateProfile(data);
    setProfile(updated);
    setIsNewUser(false);
    return updated;
  }, [profile]);

  const value = {
    user,
    profile,
    isAuthenticated,
    isLoading,
    isNewUser,
    sendOtp,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
