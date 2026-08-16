import api from './api';

export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/**
 * login - Authenticates admin using email and password
 */
export async function login(email, password) {
  if (isDemoMode()) {
    // Basic verification in demo mode
    if (email === 'admin@liv.com' && password === 'admin123') {
      const mockProfile = {
        id: 'admin-demo-uuid',
        name: 'Admin User',
        phone: '+919999999999',
        email: 'admin@liv.com',
        role: 'admin',
        created_at: new Date().toISOString()
      };
      const mockSession = {
        access_token: 'demo-admin-access-token',
        refresh_token: 'demo-admin-refresh-token',
        expires_at: Date.now() + 86400000
      };

      localStorage.setItem('liv_admin_session', JSON.stringify(mockSession));
      localStorage.setItem('liv_admin_profile', JSON.stringify(mockProfile));

      return { session: mockSession, profile: mockProfile, user: { id: mockProfile.id, email } };
    } else {
      throw new Error('Invalid email or password (Demo: admin@liv.com / admin123)');
    }
  }

  // Call the backend /api/auth/admin/login endpoint
  const { data } = await api.post('/api/auth/admin/login', { email, password });
  
  if (data.success && data.data) {
    const { session, profile } = data.data;
    
    // Check if role is admin
    if (profile.role !== 'admin') {
      throw new Error('Access denied: Admin role required');
    }

    localStorage.setItem('liv_admin_session', JSON.stringify(session));
    localStorage.setItem('liv_admin_profile', JSON.stringify(profile));
    return data.data;
  }
  
  throw new Error('Invalid response from server');
}

export async function getProfile() {
  if (isDemoMode()) {
    const cached = localStorage.getItem('liv_admin_profile');
    return cached ? JSON.parse(cached) : null;
  }
  const { data } = await api.get('/api/auth/me');
  return data.data;
}

export async function logout() {
  localStorage.removeItem('liv_admin_session');
  localStorage.removeItem('liv_admin_profile');
}
