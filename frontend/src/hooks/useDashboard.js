import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGateway } from '../context/GatewayContext';
import { useOfflineCache } from './useOfflineCache';
import { useSocket } from './useSocket';
import * as dashboardService from '../services/dashboardService';
import * as demoService from '../services/demoService';
import { STORAGE_KEYS } from '../utils/constants';

/**
 * Core dashboard hook — merges REST data with live Socket.IO updates.
 * Falls back to IndexedDB cache when offline.
 * Uses demo data when in demo mode.
 */
export function useDashboard() {
  const { selectedGateway } = useGateway();
  const queryClient = useQueryClient();
  const gatewayId = selectedGateway?.gateway_id;
  const lastUpdateRef = useRef(null);

  const queryFn = useCallback(async () => {
    let raw;
    if (demoService.isDemoMode()) {
      raw = demoService.generateDashboard();
    } else {
      if (!gatewayId) return null;
      raw = await dashboardService.getDashboard(gatewayId);
    }

    if (!raw) return null;

    // Normalize response to clean camelCase data model
    const gateway = {
      gatewayId: raw.gateway?.gatewayId || raw.gateway?.gateway_id,
      gatewayName: raw.gateway?.gatewayName || raw.gateway?.gateway_name,
      status: raw.gateway?.status || 'offline',
      lastSeen: raw.gateway?.lastSeen || raw.gateway?.last_seen,
      pumpStatus: raw.gatewayMetrics?.pumpStatus !== undefined ? raw.gatewayMetrics.pumpStatus : raw.gatewayMetrics?.pump_status,
      waterLevel: raw.gatewayMetrics?.waterLevel !== undefined ? raw.gatewayMetrics.waterLevel : raw.gatewayMetrics?.water_level,
      battery: raw.gatewayMetrics?.battery,
      recordedAt: raw.gatewayMetrics?.recordedAt || raw.gatewayMetrics?.recorded_at,
    };

    const nodes = (raw.nodes || []).map((node) => ({
      nodeId: node.nodeId || node.node_id,
      cropName: node.cropName || node.crop_name,
      status: node.status || (node.recorded_at || node.recordedAt || node.timestamp ? (Date.now() - new Date(node.recorded_at || node.recordedAt || node.timestamp).getTime() < 300000 ? 'online' : 'offline') : 'offline'),
      soilMoisture: node.soilMoisture !== undefined ? node.soilMoisture : node.soil_moisture,
      temperature: node.temperature,
      humidity: node.humidity,
      valveStatus: node.valveStatus !== undefined ? node.valveStatus : node.valve_status,
      battery: node.battery,
      recordedAt: node.recordedAt || node.recorded_at || node.timestamp
    }));

    return {
      gateway,
      nodes,
      nodeCount: raw.nodeCount ?? nodes.length
    };
  }, [gatewayId]);

  const {
    rawData: dashboard,
    isOffline,
    lastSync,
    isLoading,
    isError,
    error,
    refresh,
  } = useOfflineCache(
    `${STORAGE_KEYS.DASHBOARD}-${gatewayId}`,
    ['dashboard', gatewayId],
    queryFn,
    { enabled: !!gatewayId || demoService.isDemoMode() }
  );

  // Handle gateway:update socket events
  const handleGatewayUpdate = useCallback(
    (data) => {
      if (!gatewayId || data.gatewayId !== gatewayId) return;
      lastUpdateRef.current = new Date().toISOString();

      queryClient.setQueryData(['dashboard', gatewayId], (prev) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            gateway: {
              ...prev.data.gateway,
              status: data.status || prev.data.gateway?.status,
              lastSeen: data.lastSeen || prev.data.gateway?.lastSeen,
              pumpStatus: data.pumpStatus ?? prev.data.gateway?.pumpStatus,
              waterLevel: data.waterLevel ?? prev.data.gateway?.waterLevel,
              battery: data.battery ?? prev.data.gateway?.battery,
              recordedAt: data.timestamp || prev.data.gateway?.recordedAt,
            },
          },
        };
      });
    },
    [gatewayId, queryClient]
  );

  // Handle gateway:status socket events
  const handleGatewayStatus = useCallback(
    (data) => {
      if (!gatewayId || data.gatewayId !== gatewayId) return;

      queryClient.setQueryData(['dashboard', gatewayId], (prev) => {
        if (!prev?.data) return prev;
        return {
          ...prev,
          data: {
            ...prev.data,
            gateway: {
              ...prev.data.gateway,
              status: data.status,
              lastSeen: data.lastSeen || prev.data.gateway?.lastSeen,
            },
          },
        };
      });
    },
    [gatewayId, queryClient]
  );

  // Handle node:update socket events
  const handleNodeUpdate = useCallback(
    (data) => {
      if (!gatewayId || data.gatewayId !== gatewayId) return;
      lastUpdateRef.current = new Date().toISOString();

      queryClient.setQueryData(['dashboard', gatewayId], (prev) => {
        if (!prev?.data) return prev;
        const nodes = (prev.data.nodes || []).map((node) => {
          if (node.nodeId === data.nodeId) {
            return {
              ...node,
              status: data.status || 'online',
              soilMoisture: data.soilMoisture ?? node.soilMoisture,
              temperature: data.temperature ?? node.temperature,
              humidity: data.humidity ?? node.humidity,
              valveStatus: data.valveStatus ?? node.valveStatus,
              battery: data.battery ?? node.battery,
              recordedAt: data.timestamp || node.recordedAt,
            };
          }
          return node;
        });
        return { ...prev, data: { ...prev.data, nodes } };
      });
    },
    [gatewayId, queryClient]
  );

  useSocket('gateway:update', handleGatewayUpdate);
  useSocket('gateway:status', handleGatewayStatus);
  useSocket('node:update', handleNodeUpdate);

  return {
    dashboard,
    isLoading,
    isError,
    error,
    isOffline,
    lastSync,
    refresh,
    lastUpdate: lastUpdateRef.current,
  };
}
