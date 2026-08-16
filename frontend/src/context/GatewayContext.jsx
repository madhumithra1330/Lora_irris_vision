import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as gatewayService from '../services/gatewayService';
import * as demoService from '../services/demoService';
import { save, load } from '../services/storageService';
import { STORAGE_KEYS } from '../utils/constants';

const GatewayContext = createContext(null);

export function GatewayProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [gateways, setGateways] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasMultiple = gateways.length > 1;
  const hasNone = gateways.length === 0 && !isLoading;

  // Fetch gateways when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    async function fetchGateways() {
      setIsLoading(true);
      try {
        let gwList;
        if (demoService.isDemoMode()) {
          gwList = demoService.generateGateways();
        } else {
          gwList = await gatewayService.getMyGateways();
        }
        setGateways(gwList || []);

        // Auto-select logic
        if (gwList && gwList.length > 0) {
          // Check for previously selected gateway
          const cached = await load(STORAGE_KEYS.SELECTED_GATEWAY);
          const cachedId = cached?.data;
          const found = cachedId && gwList.find((g) => g.gateway_id === cachedId);

          if (found) {
            setSelectedGateway(found);
          } else {
            setSelectedGateway(gwList[0]);
            await save(STORAGE_KEYS.SELECTED_GATEWAY, gwList[0].gateway_id);
          }
        }
      } catch (err) {
        console.error('[GatewayContext] Failed to fetch gateways:', err);
        // Try loading from cache
        const cached = await load(STORAGE_KEYS.GATEWAYS);
        if (cached?.data) {
          setGateways(cached.data);
          if (cached.data.length > 0) {
            setSelectedGateway(cached.data[0]);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchGateways();
  }, [isAuthenticated]);

  // Cache gateways when they change
  useEffect(() => {
    if (gateways.length > 0) {
      save(STORAGE_KEYS.GATEWAYS, gateways);
    }
  }, [gateways]);

  const selectGateway = useCallback(async (gateway) => {
    setSelectedGateway(gateway);
    await save(STORAGE_KEYS.SELECTED_GATEWAY, gateway.gateway_id);
  }, []);

  const refreshGateways = useCallback(async () => {
    if (demoService.isDemoMode()) return;
    try {
      const gwList = await gatewayService.getMyGateways();
      setGateways(gwList || []);
    } catch (err) {
      console.error('[GatewayContext] Refresh failed:', err);
    }
  }, []);

  const value = {
    gateways,
    selectedGateway,
    isLoading,
    hasMultiple,
    hasNone,
    selectGateway,
    refreshGateways,
  };

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway() {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error('useGateway must be used within GatewayProvider');
  }
  return context;
}
