import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import * as socketService from '../services/socketService';
import * as demoService from '../services/demoService';
import { isDemoMode } from '../services/authService';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastConnected, setLastConnected] = useState(null);
  
  const stopSimRef = useRef(null);
  const demoListenersRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated) return;

    if (isDemoMode()) {
      setIsConnected(true);
      setLastConnected(new Date().toISOString());

      // Start demo simulation
      stopSimRef.current = demoService.startDemoSimulation((event) => {
        const listeners = demoListenersRef.current.get(event.type);
        if (listeners) {
          listeners.forEach((cb) => cb(event.data));
        }
      });

      return () => {
        if (stopSimRef.current) {
          stopSimRef.current();
          stopSimRef.current = null;
        }
      };
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

  const subscribe = useCallback((event, callback) => {
    if (isDemoMode()) {
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
    if (!isDemoMode()) {
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
