import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Activity } from 'lucide-react';
import { formatTime } from '../utils/formatters';

export default function ActivityTimeline({ events }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const displayItems = expanded ? events : events.slice(0, 5);

  if (!events || events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
        className="card"
        role="region"
        aria-label={t('nav.activity')}
      >
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-liv-400" />
          <h2 className="text-sm font-bold text-white font-[Outfit] tracking-wide">{t('nav.activity')}</h2>
        </div>
        <p className="text-sm text-white/30 text-center py-4">{t('empty.noActivity')}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
      className="card"
      role="region"
      aria-label={t('nav.activity')}
    >
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="w-5 h-5 text-liv-400" />
        <h2 className="text-sm font-bold text-white font-[Outfit] tracking-wide">{t('nav.activity')}</h2>
      </div>

      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {displayItems.map((event, i) => {
            const resolvedMessage = t(event.message, event.params || {});
            const msgLower = resolvedMessage.toLowerCase();
            const keyLower = String(event.message).toLowerCase();
            const isActionOn =
              keyLower.includes('on') ||
              keyLower.includes('opened') ||
              keyLower.includes('online') ||
              keyLower.includes('started') ||
              keyLower.includes('connected') ||
              msgLower.includes('on') ||
              msgLower.includes('opened') ||
              msgLower.includes('online') ||
              msgLower.includes('started') ||
              msgLower.includes('connected') ||
              msgLower.includes('திறக்கப்பட்டது') ||
              msgLower.includes('தொடங்கப்பட்டது') ||
              msgLower.includes('ஆன்லைன்') ||
              msgLower.includes('चालू') ||
              msgLower.includes('खुल') ||
              msgLower.includes('ऑनलाइन');
            
            const dotColor = isActionOn ? 'bg-liv-500' : 'bg-surface-500';

            return (
              <motion.div
                key={event.id || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surface-800 transition-colors"
              >
                {/* Timeline icon */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-surface-700/50 shrink-0`}>
                  {event.icon || <Activity className={`w-4 h-4 ${isActionOn ? 'text-liv-400' : 'text-gray-400'}`} />}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">{t(event.message, event.params || {})}</p>
                </div>

                {/* Time */}
                <span className="text-[10px] font-medium text-gray-500 shrink-0 bg-surface-800 px-2 py-1 rounded-md">
                  {formatTime(event.timestamp)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {events.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs text-liv-400 font-bold mt-4 py-3 bg-surface-800/50 hover:bg-surface-800 rounded-xl transition-colors tracking-wide"
        >
          {expanded ? t('general.showLess') : t('general.showMore', { count: events.length - 5 })}
        </button>
      )}
    </motion.div>
  );
}
