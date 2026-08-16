import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketContext } from '../context/SocketContext';
import { save } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Pull-to-refresh / manual refresh hook.
 * Refetches dashboard data, reconnects socket, updates last sync.
 */
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { reconnect, isConnected } = useSocketContext();

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Reconnect socket if disconnected
      if (!isConnected) {
        reconnect();
      }

      // Invalidate all queries to refetch
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['gateways'] });

      // Update last sync
      await save(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (err) {
      console.error('[Refresh] Failed:', err);
    } finally {
      // Minimum visible refresh time for UX
      setTimeout(() => setIsRefreshing(false), 600);
    }
  }, [queryClient, reconnect, isConnected]);

  return { refresh, isRefreshing };
}
