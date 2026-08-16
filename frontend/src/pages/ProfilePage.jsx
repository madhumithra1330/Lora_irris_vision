import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useGateway } from '../context/GatewayContext';
import ConnectionDiagnostics from '../components/ConnectionDiagnostics';
import { APP_VERSION, APP_NAME } from '../utils/constants';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile, logout } = useAuth();
  const { selectedGateway } = useGateway();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: profile?.phone });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="px-4 pt-4 pb-safe space-y-4">
      <h1 className="text-xl font-bold font-[Outfit] text-white">{t('nav.profile')}</h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card space-y-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-liv-500 to-liv-700 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : '👤'}
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-white text-base focus:outline-none focus:ring-2 focus:ring-liv-500"
                autoFocus
                aria-label={t('profile.editName')}
              />
            ) : (
              <h2 className="text-lg font-bold text-white">{profile?.name || t('profile.farmer')}</h2>
            )}
            <p className="text-sm text-white/40">{profile?.phone || ''}</p>
            {profile?.email && (
              <p className="text-[11px] text-white/30">{profile.email}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setName(profile?.name || ''); }} className="btn btn-ghost flex-1 text-sm !min-h-[40px]">
                {t('general.cancel')}
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn btn-primary flex-1 text-sm !min-h-[40px]">
                {isSaving ? t('profile.saving') : t('general.save')}
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn btn-ghost flex-1 text-sm !min-h-[40px]">
              {t('profile.editName')}
            </button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>🌐</span> {t('profile.language')}
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={() => changeLanguage('en')} 
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${i18n.language === 'en' ? 'bg-liv-500 text-white' : 'bg-surface-700 text-gray-400'}`}
          >
            English
          </button>
          <button 
            onClick={() => changeLanguage('ta')} 
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${i18n.language === 'ta' ? 'bg-liv-500 text-white' : 'bg-surface-700 text-gray-400'}`}
          >
            தமிழ்
          </button>
          <button 
            onClick={() => changeLanguage('hi')} 
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${i18n.language === 'hi' ? 'bg-liv-500 text-white' : 'bg-surface-700 text-gray-400'}`}
          >
            हिन्दी
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>📡</span> {t('dashboard.gateway')}
        </h3>
        {selectedGateway ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-white/50 shrink-0">{t('profile.gatewayName')}</span>
              <span className="text-sm text-white truncate text-right">{selectedGateway.gateway_name || selectedGateway.gateway_id}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-white/50 shrink-0">{t('profile.gatewayId')}</span>
              <span className="text-sm text-white/70 font-mono text-xs truncate text-right">{selectedGateway.gateway_id}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-sm text-white/50 shrink-0">{t('profile.connectionStatus')}</span>
              <span className={`chip text-[11px] ${selectedGateway.status === 'online' ? 'chip-success' : 'chip-danger'}`}>
                {selectedGateway.status === 'online' ? t('status.online') : t('status.offline')}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/30">{t('profile.noGatewayClaimed')}</p>
        )}
      </motion.div>

      <ConnectionDiagnostics />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <span>ℹ️</span> {t('profile.aboutLIV')}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm text-white/50 shrink-0">{t('profile.app')}</span>
            <span className="text-sm text-white truncate text-right">{APP_NAME}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm text-white/50 shrink-0">{t('profile.appVersion')}</span>
            <span className="text-sm text-white/70 truncate text-right">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-sm text-white/50 shrink-0">{t('profile.supportInfo')}</span>
            <span className="text-sm text-liv-400 truncate text-right">{t('profile.supportEmail')}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {showLogout ? (
          <div className="card space-y-3">
            <p className="text-sm text-white text-center">{t('profile.logoutConfirm')}</p>
            <p className="text-xs text-white/30 text-center">{t('profile.logoutDesc')}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLogout(false)} className="btn btn-ghost flex-1 text-sm">
                {t('general.cancel')}
              </button>
              <button onClick={handleLogout} className="btn btn-danger flex-1 text-sm">
                {t('profile.signOut')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogout(true)}
            className="btn btn-ghost w-full text-danger border-danger/20"
          >
            {t('profile.signOut')}
          </button>
        )}
      </motion.div>
    </div>
  );
}
