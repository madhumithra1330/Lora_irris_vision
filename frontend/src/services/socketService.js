import { io } from 'socket.io-client';

let socket = null;
let connectionState = 'disconnected';
const listeners = new Set();

/**
 * Connect to Socket.IO server.
 */
export function connect(url) {
  if (socket?.connected) return;

  const socketUrl = url || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    connectionState = 'connected';
    notifyListeners('connectionChange', { state: 'connected' });
  });

  socket.on('disconnect', () => {
    connectionState = 'disconnected';
    notifyListeners('connectionChange', { state: 'disconnected' });
  });

  socket.io.on('reconnect_attempt', () => {
    connectionState = 'reconnecting';
    notifyListeners('connectionChange', { state: 'reconnecting' });
  });

  socket.io.on('reconnect', () => {
    connectionState = 'connected';
    notifyListeners('connectionChange', { state: 'connected' });
  });
}

/**
 * Disconnect from Socket.IO server.
 */
export function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connectionState = 'disconnected';
  }
}

/**
 * Join a gateway-specific room.
 */
export function joinGateway(gatewayId) {
  if (socket?.connected && gatewayId) {
    socket.emit('join:gateway', gatewayId);
  }
}

/**
 * Leave a gateway room.
 */
export function leaveGateway(gatewayId) {
  if (socket?.connected && gatewayId) {
    socket.emit('leave:gateway', gatewayId);
  }
}

/**
 * Subscribe to a socket event.
 */
export function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Unsubscribe from a socket event.
 */
export function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}

/**
 * Get current connection state.
 */
export function getConnectionState() {
  return connectionState;
}

/**
 * Check if connected.
 */
export function isConnected() {
  return socket?.connected || false;
}

/**
 * Internal: notify connection state listeners.
 */
function notifyListeners(event, data) {
  listeners.forEach((fn) => fn(event, data));
}

/**
 * Add a connection state listener.
 */
export function addConnectionListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Reconnect socket.
 */
export function reconnect() {
  if (socket && !socket.connected) {
    socket.connect();
  }
}
