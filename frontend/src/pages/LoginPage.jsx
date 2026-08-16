import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../utils/constants';

export default function LoginPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { sendOtp, login } = useAuth();

  const formatPhone = (value) => {
    // Keep only digits, max 10
    return value.replace(/\D/g, '').slice(0, 10);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError(t('auth.enterValidPhone'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendOtp(`+91${phone}`);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || t('auth.failedSendOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError(t('auth.enterSixDigitOtp'));
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(`+91${phone}`, otp);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('auth.invalidOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 bg-surface-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-surface-800 border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(34,197,94,0.15)]">
          <img
            src="/LIV_Logo.png"
            alt={t('general.logoAlt')}
            className="w-16 h-16 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold font-[Outfit] text-white">{APP_NAME}</h1>
        <p className="text-sm text-liv-200/50 mt-1">{t('general.tagline')}</p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-[360px]"
      >
        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSendOtp}
              className="space-y-5"
            >
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-white/60 mb-2">
                  {t('auth.phoneNumber')}
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-surface-700 border border-white/10 rounded-xl text-sm text-white/50">
                    +91
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder={t('auth.enterNumber')}
                    className="flex-1 bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-liv-500 focus:border-transparent transition-all"
                    autoComplete="tel"
                    autoFocus
                    inputMode="numeric"
                    aria-label={t('auth.phoneNumber')}
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-danger text-center"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading || phone.length !== 10}
                className="btn btn-primary w-full text-base"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('auth.sendingOtp')}
                  </span>
                ) : t('auth.sendOtp')}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleVerifyOtp}
              className="space-y-5"
            >
              <div className="text-center mb-2">
                <p className="text-sm text-white/60">
                  {t('auth.otpSent')} <span className="text-white font-medium">+91 {phone}</span>
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-white/60 mb-2">
                  {t('auth.enterOtp')}
                </label>
                <input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.sixDigitCode')}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-[Outfit] tracking-[0.3em] placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-liv-500 focus:border-transparent transition-all"
                  autoComplete="one-time-code"
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  aria-label={t('auth.enterOtp')}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-danger text-center"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="btn btn-primary w-full text-base"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('auth.verifying')}
                  </span>
                ) : t('auth.verifyAndLogin')}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-center text-sm text-liv-400 hover:underline"
              >
                {t('auth.changeNumber')}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <p className="text-[11px] text-white/20 mt-12">{t('general.appVersionText')}</p>
    </div>
  );
}
