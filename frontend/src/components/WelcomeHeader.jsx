import { useTranslation } from 'react-i18next';
import ConnectionStatus from './ConnectionStatus';
import GatewaySelector from './GatewaySelector';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { formatGreeting, formatDate, formatRelativeTime } from '../utils/formatters';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

export default function WelcomeHeader({ isOffline, lastSync }) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const { isConnected } = useSocketContext();
  const { refresh, isRefreshing } = usePullToRefresh();

  return (
    <div className="space-y-3">
      {/* Top row: greeting + refresh */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-white font-[Outfit] break-words">
            {formatGreeting(profile?.name, t)}
          </h1>
          <p className="text-sm text-liv-200/60 mt-0.5 truncate">{formatDate(undefined, i18n.language)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus />
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-700 border border-white/10 transition-all active:scale-95"
            aria-label={t('errors.retry')}
          >
            <svg
              className={`w-5 h-5 text-liv-400 ${isRefreshing ? 'animate-spin-refresh' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Gateway selector if multiple */}
      <GatewaySelector />

      {/* Offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/10 border border-warning/20" role="alert">
          <span className="text-sm">📡</span>
          <span className="text-xs text-warning font-medium">
            {t('general.showingLastKnownSynced', { time: formatRelativeTime(lastSync, t) })}
          </span>
        </div>
      )}
    </div>
  );
}
