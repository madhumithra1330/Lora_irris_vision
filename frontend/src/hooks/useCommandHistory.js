import { useState, useEffect, useCallback } from 'react';
import { saveCommand, loadCommands } from '../services/storageService';

/**
 * Command history hook — persists commands to IndexedDB.
 */
export function useCommandHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function init() {
      const stored = await loadCommands();
      setHistory(stored || []);
    }
    init();
  }, []);

  const addCommand = useCallback(async (entry) => {
    const cmd = {
      command: entry.command,
      target: entry.target || 'Gateway',
      timestamp: entry.timestamp || new Date().toISOString(),
      status: entry.status || 'sent',
    };
    await saveCommand(cmd);
    setHistory((prev) => [{ ...cmd, id: Date.now() }, ...prev].slice(0, 50));
  }, []);

  return {
    history: history.slice(0, 10),
    fullHistory: history,
    addCommand,
  };
}
