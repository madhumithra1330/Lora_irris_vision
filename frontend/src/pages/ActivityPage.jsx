import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Activity } from 'lucide-react';
import { useFarmTimeline } from '../hooks/useFarmTimeline';
import { formatTime, formatDate } from '../utils/formatters';
import EmptyState from '../components/EmptyState';

export default function ActivityPage() {
  const { t } = useTranslation();
  const { allEvents, clearTimeline } = useFarmTimeline();

  // Filter for operational events only (farmer-friendly)
  const operationalEvents = allEvents.filter((event) => {
    const msg = event.message.toLowerCase();
    // Exclude general updates and sensor notifications that aren't explicit farmer-friendly actions
    return (
      !msg.includes('updated') &&
      !msg.includes('sensor') &&
      !msg.includes('received')
    );
  });

  return (
    <div className="px-4 pt-4 pb-safe space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white font-[Outfit] tracking-wide">{t('nav.activity')}</h1>
          <p className="text-xs text-gray-400">{t('activity.headerDesc')}</p>
        </div>
        {operationalEvents.length > 0 && (
          <button
            onClick={clearTimeline}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={t('activity.clearLog')}
          >
            {t('activity.clearLog')}
          </button>
        )}
      </div>

      {/* Events Timeline */}
      <div className="space-y-4 pt-2">
        {operationalEvents.length === 0 ? (
          <div className="pt-8">
            <EmptyState 
              icon={ClipboardList} 
              title={t('empty.noActivity')} 
              message={t('empty.noActivityDesc')} 
            />
          </div>
        ) : (
          <div className="relative border-l-2 border-surface-700 ml-4 pl-6 space-y-6">
            <AnimatePresence initial={false}>
              {operationalEvents.map((event, index) => {
                const eventDate = formatDate(event.timestamp);
                const isNewDay =
                  index === 0 ||
                  formatDate(operationalEvents[index - 1].timestamp) !== eventDate;

                // Color themes based on message content
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
                
                const dotColor = isActionOn ? 'bg-liv-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]' : 'bg-surface-600';

                return (
                  <div key={event.id || index} className="space-y-3">
                    {isNewDay && (
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest -ml-[33px] pl-2 mb-4 bg-surface-900 sticky top-12 py-1.5 z-10">
                        {eventDate}
                      </div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                      className="relative flex items-center justify-between p-3 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors border border-transparent hover:border-white/5"
                    >
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] w-3 h-3 rounded-full ${dotColor} border-[3px] border-surface-900`} />
                      
                      {/* Event description */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-sm">
                          {event.icon || <Activity className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white/90">{resolvedMessage}</p>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {t(event.type ? `activity.type.${event.type}` : 'activity.type.command', event.type ? event.type.replace('_', ' ').toUpperCase() : 'Action')}
                          </span>
                        </div>
                      </div>

                      {/* Time */}
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                        {formatTime(event.timestamp)}
                      </span>
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
