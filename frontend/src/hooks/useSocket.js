import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

/**
 * Subscribe to a socket event with auto-cleanup.
 *
 * @param {string} event - Socket event name
 * @param {function} callback - Event handler
 */
export function useSocket(event, callback) {
  const { subscribe } = useSocketContext();

  useEffect(() => {
    if (!event || !callback) return;
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
}
