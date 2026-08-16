import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function SplashScreen() {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-900 px-6">
      <div className="text-center space-y-6">
        {/* Animated logo wrapper */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 120,
            damping: 15,
            duration: 0.8
          }}
          className="relative w-32 h-32 mx-auto"
        >
          {/* Pulsing ring background */}
          <div className="absolute inset-0 rounded-full bg-liv-500/10 animate-pulse-slow blur-xl" />
          
          {/* Logo container */}
          <div className="relative w-full h-full rounded-3xl bg-surface-800 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
            <img
              src="/LIV_Logo.png"
              alt={t('general.logoAlt')}
              className="w-24 h-24 object-contain"
            />
          </div>
        </motion.div>

        {/* Text branding */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-extrabold font-[Outfit] text-white tracking-wide">
            LIV Smart Irrigation
          </h1>
          <p className="text-sm font-medium text-liv-400">
            {t('general.tagline')}
          </p>
        </motion.div>

        {/* Spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-8 flex justify-center"
        >
          <div className="w-8 h-8 rounded-full border-2 border-liv-500/20 border-t-liv-500 animate-spin" />
        </motion.div>
      </div>

      {/* Version badge */}
      <div className="absolute bottom-8 text-[11px] font-medium text-white/20 tracking-wider">
        {t('general.systemInitializing', { version: '1.0' })}
      </div>
    </div>
  );
}
