import { io } from 'socket.io-client';

let socket = null;
let connectionState = 'disconnected';
const listeners = new Set();

export function connect(url) {
  if (socket?.connected) return;

  const socketUrl = url || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    connectionState = 'connected';
    socket.emit('join:admin'); // Join the admin room to receive all telemetry updates
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
    socket.emit('join:admin');
    notifyListeners('connectionChange', { state: 'connected' });
  });
}

export function disconnect() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    connectionState = 'disconnected';
  }
}

export function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

export function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}

export function getConnectionState() {
  return connectionState;
}

export function isConnected() {
  return socket?.connected || false;
}

function notifyListeners(event, data) {
  listeners.forEach((fn) => fn(event, data));
}

export function addConnectionListener(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function reconnect() {
  if (socket && !socket.connected) {
    socket.connect();
  }
}
