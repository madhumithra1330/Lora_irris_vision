import { useState, useEffect, useCallback } from 'react';
import { saveTimelineEvent, loadTimeline, clearStore, STORES } from '../services/storageService';

/**
 * Farm activity timeline hook.
 * Aggregates commands, node updates, gateway events, and alerts.
 */
export function useFarmTimeline() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function init() {
      const stored = await loadTimeline();
      setEvents(stored || []);
    }
    init();
  }, []);

  const addEvent = useCallback(async (event) => {
    const entry = {
      type: event.type,
      message: event.message,
      icon: event.icon || '📋',
      timestamp: event.timestamp || new Date().toISOString(),
    };
    await saveTimelineEvent(entry);
    setEvents((prev) => [{ ...entry, id: Date.now() + Math.random() }, ...prev].slice(0, 100));
  }, []);

  const clearTimeline = useCallback(async () => {
    await clearStore(STORES.TIMELINE);
    await clearStore(STORES.COMMAND_HISTORY);
    setEvents([]);
  }, []);

  return {
    events: events.slice(0, 20),
    allEvents: events,
    addEvent,
    clearTimeline,
  };
}
