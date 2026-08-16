import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { save, load } from '../services/storageService';

/**
 * Wraps a TanStack query with IndexedDB offline fallback.
 *
 * @param {string} cacheKey - IndexedDB key for this data
 * @param {string[]} queryKey - TanStack Query key array
 * @param {function} queryFn - Async fetch function
 * @param {object} [options] - Additional TanStack Query options
 */
export function useOfflineCache(cacheKey, queryKey, queryFn, options = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn();
        // Cache on success
        await save(cacheKey, data);
        return { data, isOffline: false, lastSync: new Date().toISOString() };
      } catch (err) {
        // On network error, try cached data
        const cached = await load(cacheKey);
        if (cached?.data) {
          return {
            data: cached.data,
            isOffline: true,
            lastSync: new Date(cached.savedAt).toISOString(),
          };
        }
        throw err; // No cache available
      }
    },
    staleTime: 30000,
    gcTime: 300000,
    retry: 1,
    ...options,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    ...query,
    rawData: query.data?.data ?? null,
    isOffline: query.data?.isOffline ?? false,
    lastSync: query.data?.lastSync ?? null,
    refresh,
  };
}
