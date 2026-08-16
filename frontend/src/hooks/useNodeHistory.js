import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as gatewayService from '../services/gatewayService';
import * as demoService from '../services/demoService';
import { save, load } from '../services/storageService';
import { generateTimeSeries } from '../utils/demoDataGenerator';

/**
 * Hook for fetching node sensor history with demo data fallback.
 *
 * @param {string} nodeId
 * @param {'24h'|'7d'|'30d'} range
 */
export function useNodeHistory(nodeId, range = '24h') {
  const cacheKey = `nodeHistory-${nodeId}-${range}`;

  const rangeMs = {
    '24h': 24 * 3600000,
    '7d': 7 * 24 * 3600000,
    '30d': 30 * 24 * 3600000,
  };

  const query = useQuery({
    queryKey: ['nodeHistory', nodeId, range],
    queryFn: async () => {
      // Demo mode — generate data
      if (demoService.isDemoMode()) {
        return {
          data: demoService.generateHistory(nodeId, range),
          isDemo: true,
        };
      }

      try {
        const from = new Date(Date.now() - (rangeMs[range] || rangeMs['24h'])).toISOString();
        const to = new Date().toISOString();
        const limit = range === '24h' ? 48 : range === '7d' ? 168 : 360;
        const data = await gatewayService.getNodeHistory(nodeId, { from, to, limit });

        // If empty, generate demo data as fallback
        if (!data || data.length === 0) {
          return {
            data: generateTimeSeries(nodeId, range),
            isDemo: true,
          };
        }

        // Cache on success
        await save(cacheKey, data);
        return { data, isDemo: false };
      } catch {
        // Try cache
        const cached = await load(cacheKey);
        if (cached?.data) {
          return { data: cached.data, isDemo: false, isOffline: true };
        }
        // Final fallback: demo data
        return {
          data: generateTimeSeries(nodeId, range),
          isDemo: true,
        };
      }
    },
    enabled: !!nodeId,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Calculate summary insights
  const insights = useMemo(() => {
    const records = query.data?.data || [];
    if (records.length === 0) return null;

    const moistures = records.map((r) => r.soil_moisture).filter((v) => v != null);
    const temps = records.map((r) => r.temperature).filter((v) => v != null);
    const humidities = records.map((r) => r.humidity).filter((v) => v != null);
    const waterLevels = records.map((r) => r.water_level).filter((v) => v != null);

    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const max = (arr) => arr.length > 0 ? Math.max(...arr) : null;
    const min = (arr) => arr.length > 0 ? Math.min(...arr) : null;

    return {
      avgMoisture: avg(moistures),
      avgHumidity: avg(humidities),
      maxTemperature: max(temps),
      minWaterLevel: min(waterLevels),
    };
  }, [query.data]);

  return {
    history: query.data?.data || [],
    isDemo: query.data?.isDemo || false,
    isOffline: query.data?.isOffline || false,
    isLoading: query.isLoading,
    isError: query.isError,
    insights,
  };
}
