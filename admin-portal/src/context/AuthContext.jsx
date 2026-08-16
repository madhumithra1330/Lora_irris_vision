import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const cachedSession = localStorage.getItem('liv_admin_session');
        const cachedProfile = localStorage.getItem('liv_admin_profile');

        if (!cachedSession || !cachedProfile) {
          setIsLoading(false);
          return;
        }

        if (authService.isDemoMode()) {
          setProfile(JSON.parse(cachedProfile));
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        const savedProfile = await authService.getProfile();
        if (savedProfile && savedProfile.role === 'admin') {
          setProfile(savedProfile);
          setIsAuthenticated(true);
        } else {
          // If profile isn't admin, logout
          await authService.logout();
          setProfile(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Token expired or invalid
        await authService.logout();
        setProfile(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authService.login(email, password);
    setProfile(result.profile);
    setIsAuthenticated(true);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setProfile(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    profile,
    isAuthenticated,
    isLoading,
    login,
    logout,
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
