import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useGateway } from './GatewayContext';
import * as socketService from '../services/socketService';
import * as demoService from '../services/demoService';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { selectedGateway } = useGateway();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastConnected, setLastConnected] = useState(null);
  const prevGatewayRef = useRef(null);
  const stopSimRef = useRef(null);
  const demoListenersRef = useRef(new Map());

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated) return;

    if (demoService.isDemoMode()) {
      setIsConnected(true);
      setLastConnected(new Date().toISOString());
      return;
    }

    socketService.connect();

    const removeListener = socketService.addConnectionListener((event, data) => {
      if (event === 'connectionChange') {
        setIsConnected(data.state === 'connected');
        setIsReconnecting(data.state === 'reconnecting');
        if (data.state === 'connected') {
          setLastConnected(new Date().toISOString());
        }
      }
    });

    return () => {
      removeListener();
      socketService.disconnect();
      setIsConnected(false);
    };
  }, [isAuthenticated]);

  // Join/leave gateway rooms
  useEffect(() => {
    if (!isAuthenticated) return;

    const prevId = prevGatewayRef.current;
    const newId = selectedGateway?.gateway_id;

    if (demoService.isDemoMode()) {
      // Start demo simulation when gateway selected
      if (newId && !stopSimRef.current) {
        stopSimRef.current = demoService.startSimulation((event) => {
          // Notify demo listeners
          const listeners = demoListenersRef.current.get(event.type);
          if (listeners) {
            listeners.forEach((cb) => cb(event.data));
          }
        });
      }
      prevGatewayRef.current = newId;
      return () => {
        if (stopSimRef.current) {
          stopSimRef.current();
          stopSimRef.current = null;
        }
      };
    }

    if (prevId && prevId !== newId) {
      socketService.leaveGateway(prevId);
    }
    if (newId) {
      socketService.joinGateway(newId);
    }
    prevGatewayRef.current = newId;
  }, [isAuthenticated, selectedGateway]);

  // Subscribe to socket events (or demo events)
  const subscribe = useCallback((event, callback) => {
    if (demoService.isDemoMode()) {
      if (!demoListenersRef.current.has(event)) {
        demoListenersRef.current.set(event, new Set());
      }
      demoListenersRef.current.get(event).add(callback);
      return () => {
        demoListenersRef.current.get(event)?.delete(callback);
      };
    }

    socketService.on(event, callback);
    return () => socketService.off(event, callback);
  }, []);

  const reconnect = useCallback(() => {
    if (!demoService.isDemoMode()) {
      socketService.reconnect();
    }
  }, []);

  const value = {
    isConnected,
    isReconnecting,
    lastConnected,
    subscribe,
    reconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}
