import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { isDemoMode } from '../services/authService';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (emailStr) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');

    // Email validation
    if (!email) {
      return setError('Email address is required');
    }
    if (!validateEmail(email)) {
      return setError('Please enter a valid email address');
    }

    // Password validation
    if (!password) {
      return setError('Password is required');
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.message && err.message.includes('role')) {
        setError('Access denied: Admin role required');
      } else if (err.response?.status === 401 || err.message?.includes('credentials')) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.status === 403) {
        setError('Access denied: Admin access required');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Network error: Could not reach the authentication server.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = async () => {
    setLoading(true);
    setError('');
    try {
      await login('admin@liv.com', 'admin123');
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo bypass failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-field-bg flex items-center justify-center p-4">
      {/* Background soft glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-field-primary/5 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full filter blur-3xl" />

      <div className="w-full max-w-md bg-white border border-field-border rounded-3xl p-8 shadow-lg relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img src="/LIV_Logo.png" alt="LIV Logo" className="h-14 w-auto mx-auto mb-4 rounded-lg bg-white p-0.5" />
          <h2 className="text-2xl font-bold font-display text-field-text-primary">LIV Admin Portal</h2>
          <p className="text-xs text-field-text-secondary uppercase tracking-widest mt-1 font-bold">Network Operations Center Login</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-status-critical text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSignIn} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-field-text-secondary mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-field-text-secondary" size={16} />
              <input
                type="text"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-field-border rounded-2xl py-3.5 pl-11 pr-4 text-field-text-primary placeholder-field-text-secondary/55 focus:outline-none focus:border-field-primary focus:ring-1 focus:ring-field-primary transition text-sm shadow-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-field-text-secondary mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-field-text-secondary" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-field-border rounded-2xl py-3.5 pl-11 pr-12 text-field-text-primary placeholder-field-text-secondary/55 focus:outline-none focus:border-field-primary focus:ring-1 focus:ring-field-primary transition text-sm shadow-sm"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-field-text-secondary hover:text-field-text-primary p-1"
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-field-primary hover:bg-emerald-600 active:scale-[0.98] text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Mode notice & bypass button */}
        <div className="mt-8 pt-6 border-t border-field-border text-center">
          <p className="text-xs text-field-text-secondary">
            {isDemoMode() ? 'Running in DEMO simulation mode' : 'Connected to LIVE database backend'}
          </p>
          {isDemoMode() && (
            <button
              onClick={handleDemoBypass}
              disabled={loading}
              className="mt-3 text-xs font-bold text-field-primary hover:underline cursor-pointer"
            >
              Skip login & authenticate with mock Admin credentials
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
