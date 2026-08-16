import { useState, useEffect, useCallback, useRef } from 'react';
import { generateAlerts, deduplicateAlerts } from '../utils/alertEngine';
import { saveAlerts, loadAlerts, markAlertRead as markRead, clearAlerts as clearAll } from '../services/storageService';

/**
 * Client-side alert engine hook.
 * Generates alerts from dashboard data and persists to IndexedDB.
 */
export function useAlerts(dashboardData) {
  const [alerts, setAlerts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevDataRef = useRef(null);

  // Load persisted alerts on mount
  useEffect(() => {
    async function init() {
      const stored = await loadAlerts();
      setAlerts(stored || []);
      setIsLoaded(true);
    }
    init();
  }, []);

  // Generate new alerts when dashboard data changes
  useEffect(() => {
    if (!isLoaded || !dashboardData) return;

    // Avoid duplicate processing for same data
    const dataKey = JSON.stringify({
      gw: dashboardData.gatewayMetrics?.recordedAt,
      nodes: dashboardData.nodes?.map((n) => n.recorded_at),
    });
    if (dataKey === prevDataRef.current) return;
    prevDataRef.current = dataKey;

    const newAlerts = generateAlerts(dashboardData);
    if (newAlerts.length > 0) {
      setAlerts((prev) => {
        const merged = deduplicateAlerts(prev, newAlerts);
        saveAlerts(merged.slice(0, 50));
        return merged;
      });
    }
  }, [dashboardData, isLoaded]);

  const markAlertRead = useCallback(async (alertId) => {
    await markRead(alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
  }, []);

  const clearAlerts = useCallback(async () => {
    await clearAll();
    setAlerts([]);
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,
    unreadCount,
    markAlertRead,
    clearAlerts,
  };
}
