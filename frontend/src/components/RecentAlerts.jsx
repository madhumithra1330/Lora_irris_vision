import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AlertCard from './AlertCard';

export default function RecentAlerts({ alerts, onMarkRead, onClear }) {
  const { t } = useTranslation();

  if (!alerts || alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="card"
        role="region"
        aria-label={t('general.recentAlerts')}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg" aria-hidden="true">🔔</span>
          <h2 className="text-sm font-semibold text-white">{t('general.recentAlerts')}</h2>
        </div>
        <div className="text-center py-4">
          <span className="text-2xl" aria-hidden="true">✅</span>
          <p className="text-sm text-white/40 mt-2">{t('general.allClearNoAlerts')}</p>
        </div>
      </motion.div>
    );
  }

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className="card"
      role="region"
      aria-label={t('general.recentAlerts')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">🔔</span>
          <h2 className="text-sm font-semibold text-white">{t('general.recentAlerts')}</h2>
          {unreadCount > 0 && (
            <span className="chip chip-danger text-[10px] px-1.5 py-0.5">
              {unreadCount}
            </span>
          )}
        </div>
        {alerts.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
            aria-label={t('general.clear')}
          >
            {t('general.clear')}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {alerts.slice(0, 5).map((alert) => (
          <AlertCard key={alert.id} alert={alert} onMarkRead={onMarkRead} />
        ))}
      </div>
    </motion.div>
  );
}
