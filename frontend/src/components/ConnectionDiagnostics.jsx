import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSocketContext } from '../context/SocketContext';
import { useGateway } from '../context/GatewayContext';
import { useAuth } from '../context/AuthContext';
import { useDemoMode } from '../hooks/useDemoMode';
import { load } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/constants';
import { formatTimestamp } from '../utils/formatters';
import api from '../services/api';

export default function ConnectionDiagnostics() {
  const { t } = useTranslation();
  const { isConnected, isReconnecting, lastConnected } = useSocketContext();
  const { selectedGateway } = useGateway();
  const { isDemoMode } = useDemoMode();
  const [backendReachable, setBackendReachable] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Check backend reachability
  useEffect(() => {
    async function checkBackend() {
      if (isDemoMode) {
        setBackendReachable(null); // N/A in demo
        return;
      }
      try {
        await api.get('/health');
        setBackendReachable(true);
      } catch {
        setBackendReachable(false);
      }
    }
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Load last sync
  useEffect(() => {
    async function loadSync() {
      const cached = await load(STORAGE_KEYS.LAST_SYNC);
      setLastSync(cached?.data || null);
    }
    loadSync();
    const interval = setInterval(loadSync, 10000);
    return () => clearInterval(interval);
  }, []);

  // Session info
  useEffect(() => {
    async function checkSession() {
      const { loadSession } = await import('../services/storageService');
      const session = await loadSession();
      if (session?.expires_at) {
        const remaining = session.expires_at - Date.now();
        setSessionInfo({
          valid: remaining > 0,
          remaining: remaining > 0 ? Math.round(remaining / 3600000) : 0,
        });
      }
    }
    checkSession();
  }, []);

  const StatusDot = ({ state }) => {
    const colors = {
      connected: 'bg-success',
      disconnected: 'bg-danger',
      reconnecting: 'bg-warning animate-pulse',
      unknown: 'bg-white/20',
    };
    return <span className={`w-2.5 h-2.5 rounded-full ${colors[state] || colors.unknown}`} />;
  };

  const items = [
    {
      label: t('profile.backend'),
      state: isDemoMode ? 'unknown' : backendReachable === true ? 'connected' : backendReachable === false ? 'disconnected' : 'unknown',
      value: isDemoMode ? t('status.naDemo') : backendReachable === true ? t('status.connected') : backendReachable === false ? t('status.disconnected') : t('status.checking'),
    },
    {
      label: t('status.live'), // live connection
      state: isDemoMode ? 'connected' : isConnected ? 'connected' : isReconnecting ? 'reconnecting' : 'disconnected',
      value: isDemoMode ? t('status.simulated') : isConnected ? t('status.connected') : isReconnecting ? t('status.reconnecting') : t('status.offline'),
    },
    {
      label: t('profile.gateway'),
      state: selectedGateway?.status === 'online' ? 'connected' : 'disconnected',
      value: selectedGateway?.status === 'online' ? t('status.online') : t('status.offline'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      role="region"
      aria-label={t('profile.systemStatus')}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg" aria-hidden="true">🔧</span>
        <h2 className="text-sm font-semibold text-white">{t('profile.systemStatus')}</h2>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1">
            <span className="text-sm text-white/60">{item.label}</span>
            <div className="flex items-center gap-2">
              <StatusDot state={item.state} />
              <span className={`text-sm font-medium ${
                item.state === 'connected' ? 'text-success' : item.state === 'disconnected' ? 'text-danger' : item.state === 'reconnecting' ? 'text-warning' : 'text-white/40'
              }`}>
                {item.value}
              </span>
            </div>
          </div>
        ))}

        <div className="border-t border-white/6 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">{t('status.lastSync')}</span>
            <span className="text-sm text-white/40">
              {lastSync ? formatTimestamp(lastSync) : t('status.never')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">{t('status.mode')}</span>
            <span className={`text-sm font-medium ${isDemoMode ? 'text-warning' : 'text-success'}`}>
              {isDemoMode ? t('status.demoMode') : t('status.liveMode')}
            </span>
          </div>
          {sessionInfo && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">{t('status.session')}</span>
              <span className={`text-sm font-medium ${sessionInfo.valid ? 'text-success' : 'text-danger'}`}>
                {sessionInfo.valid ? t('status.validRemaining', { count: sessionInfo.remaining }) : t('status.expired')}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
