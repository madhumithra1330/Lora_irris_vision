import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { loadPreference, savePreference } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/constants';

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function check() {
      const dismissed = await loadPreference(STORAGE_KEYS.INSTALL_DISMISSED);
      if (dismissed) return;

      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
    check();
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
    if (outcome === 'dismissed') {
      await savePreference(STORAGE_KEYS.INSTALL_DISMISSED, true);
    }
  };

  const handleDismiss = async () => {
    setShow(false);
    await savePreference(STORAGE_KEYS.INSTALL_DISMISSED, true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 25 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[400px] z-50"
        >
          <div className="card-elevated flex items-center gap-3 p-4">
            <div className="w-12 h-12 rounded-xl bg-liv-600/20 flex items-center justify-center shrink-0">
              <span className="text-2xl">🌱</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{t('general.installApp')}</p>
              <p className="text-[11px] text-white/40">{t('general.installAppDesc')}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleDismiss} className="text-xs text-white/30 px-2 py-1" aria-label={t('general.dismissInstallPrompt')}>
                {t('general.later')}
              </button>
              <button onClick={handleInstall} className="btn btn-primary text-xs !min-h-[36px] !px-4 !py-1" aria-label={t('general.installAppLabel')}>
                {t('general.install')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
