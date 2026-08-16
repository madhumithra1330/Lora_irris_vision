import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatCommand, formatRelativeTime, formatTime } from '../utils/formatters';

export default function CommandHistory({ history }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? history : history.slice(0, 3);

  if (!history || history.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="card"
        role="region"
        aria-label={t('general.recentActions')}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg" aria-hidden="true">📋</span>
          <h2 className="text-sm font-semibold text-white">{t('general.recentActions')}</h2>
        </div>
        <p className="text-sm text-white/30 text-center py-4">{t('general.noCommandsSent')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="card"
      role="region"
      aria-label={t('general.recentActions')}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">📋</span>
        <h2 className="text-sm font-semibold text-white">{t('general.recentActions')}</h2>
      </div>

      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {displayItems.map((cmd, i) => (
            <motion.div
              key={cmd.id || i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs shrink-0">
                  {cmd.status === 'failed' ? '❌' : '✅'}
                </span>
                <div className="min-w-0">
                  <span className="text-sm text-white font-medium truncate block">
                    {formatCommand(cmd.command, t)}
                  </span>
                  {cmd.target && cmd.target !== 'Gateway' && (
                    <span className="text-[10px] text-white/30">{cmd.target}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-white/40 shrink-0 ml-2">
                {formatTime(cmd.timestamp)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {history.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs text-liv-400 font-medium mt-2 py-2 hover:bg-white/3 rounded-lg transition-colors"
        >
          {expanded ? t('general.showLess') : t('general.showMore', { count: history.length - 3 })}
        </button>
      )}
    </motion.div>
  );
}
