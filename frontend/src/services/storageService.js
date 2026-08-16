import { openDB } from 'idb';

const DB_NAME = 'liv-irrigation';
const DB_VERSION = 1;

const STORES = {
  APP_DATA: 'appData',
  NODE_HISTORY: 'nodeHistory',
  ALERTS: 'alerts',
  COMMAND_HISTORY: 'commandHistory',
  SESSION: 'session',
  PREFERENCES: 'preferences',
  TIMELINE: 'timeline',
};

/**
 * Get or create the IndexedDB database.
 */
function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.APP_DATA)) {
        db.createObjectStore(STORES.APP_DATA);
      }
      if (!db.objectStoreNames.contains(STORES.NODE_HISTORY)) {
        db.createObjectStore(STORES.NODE_HISTORY);
      }
      if (!db.objectStoreNames.contains(STORES.ALERTS)) {
        db.createObjectStore(STORES.ALERTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.COMMAND_HISTORY)) {
        db.createObjectStore(STORES.COMMAND_HISTORY, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(STORES.SESSION)) {
        db.createObjectStore(STORES.SESSION);
      }
      if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
        db.createObjectStore(STORES.PREFERENCES);
      }
      if (!db.objectStoreNames.contains(STORES.TIMELINE)) {
        db.createObjectStore(STORES.TIMELINE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });
}

// ============================
// Primary API (4 functions)
// ============================

/**
 * Save data to the appData store.
 */
export async function save(key, data) {
  try {
    const db = await getDB();
    await db.put(STORES.APP_DATA, { data, savedAt: Date.now() }, key);
  } catch (err) {
    console.warn('[Storage] save failed:', err.message);
  }
}

/**
 * Load data from the appData store.
 * @returns {{ data: any, savedAt: number } | null}
 */
export async function load(key) {
  try {
    const db = await getDB();
    const result = await db.get(STORES.APP_DATA, key);
    return result || null;
  } catch (err) {
    console.warn('[Storage] load failed:', err.message);
    return null;
  }
}

/**
 * Remove a key from the appData store.
 */
export async function remove(key) {
  try {
    const db = await getDB();
    await db.delete(STORES.APP_DATA, key);
  } catch (err) {
    console.warn('[Storage] remove failed:', err.message);
  }
}

/**
 * Clear all stores (used on logout).
 */
export async function clear() {
  try {
    const db = await getDB();
    const storeNames = Object.values(STORES);
    const tx = db.transaction(storeNames, 'readwrite');
    await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));
    await tx.done;
  } catch (err) {
    console.warn('[Storage] clear failed:', err.message);
  }
}

// ============================
// Store-specific helpers
// ============================

/**
 * Save to a specific store.
 */
export async function saveToStore(storeName, key, data) {
  try {
    const db = await getDB();
    if (key !== undefined) {
      await db.put(storeName, data, key);
    } else {
      await db.put(storeName, data);
    }
  } catch (err) {
    console.warn(`[Storage] saveToStore(${storeName}) failed:`, err.message);
  }
}

/**
 * Load from a specific store.
 */
export async function loadFromStore(storeName, key) {
  try {
    const db = await getDB();
    return await db.get(storeName, key);
  } catch (err) {
    console.warn(`[Storage] loadFromStore(${storeName}) failed:`, err.message);
    return null;
  }
}

/**
 * Load all entries from a specific store.
 */
export async function loadAllFromStore(storeName) {
  try {
    const db = await getDB();
    return await db.getAll(storeName);
  } catch (err) {
    console.warn(`[Storage] loadAllFromStore(${storeName}) failed:`, err.message);
    return [];
  }
}

/**
 * Remove from a specific store.
 */
export async function removeFromStore(storeName, key) {
  try {
    const db = await getDB();
    await db.delete(storeName, key);
  } catch (err) {
    console.warn(`[Storage] removeFromStore(${storeName}) failed:`, err.message);
  }
}

/**
 * Clear a specific store.
 */
export async function clearStore(storeName) {
  try {
    const db = await getDB();
    await db.clear(storeName);
  } catch (err) {
    console.warn(`[Storage] clearStore(${storeName}) failed:`, err.message);
  }
}

// ============================
// Session helpers
// ============================

export async function saveSession(session) {
  await saveToStore(STORES.SESSION, 'current', session);
}

export async function loadSession() {
  return await loadFromStore(STORES.SESSION, 'current');
}

export async function clearSession() {
  await clearStore(STORES.SESSION);
}

// ============================
// Preferences helpers
// ============================

export async function savePreference(key, value) {
  await saveToStore(STORES.PREFERENCES, key, value);
}

export async function loadPreference(key) {
  return await loadFromStore(STORES.PREFERENCES, key);
}

// ============================
// Command history helpers
// ============================

export async function saveCommand(entry) {
  try {
    const db = await getDB();
    await db.add(STORES.COMMAND_HISTORY, {
      ...entry,
      id: Date.now(),
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    // Trim to 50 max
    const all = await db.getAll(STORES.COMMAND_HISTORY);
    if (all.length > 50) {
      const toDelete = all.slice(0, all.length - 50);
      const tx = db.transaction(STORES.COMMAND_HISTORY, 'readwrite');
      for (const item of toDelete) {
        tx.store.delete(item.id);
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('[Storage] saveCommand failed:', err.message);
  }
}

export async function loadCommands() {
  const all = await loadAllFromStore(STORES.COMMAND_HISTORY);
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============================
// Timeline helpers
// ============================

export async function saveTimelineEvent(event) {
  try {
    const db = await getDB();
    await db.add(STORES.TIMELINE, {
      ...event,
      id: Date.now() + Math.random(),
      timestamp: event.timestamp || new Date().toISOString(),
    });
    // Trim to 100 max
    const all = await db.getAll(STORES.TIMELINE);
    if (all.length > 100) {
      const toDelete = all.slice(0, all.length - 100);
      const tx = db.transaction(STORES.TIMELINE, 'readwrite');
      for (const item of toDelete) {
        tx.store.delete(item.id);
      }
      await tx.done;
    }
  } catch (err) {
    console.warn('[Storage] saveTimelineEvent failed:', err.message);
  }
}

export async function loadTimeline() {
  const all = await loadAllFromStore(STORES.TIMELINE);
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// ============================
// Alert helpers
// ============================

export async function saveAlert(alert) {
  await saveToStore(STORES.ALERTS, undefined, alert);
}

export async function saveAlerts(alerts) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.ALERTS, 'readwrite');
    for (const alert of alerts) {
      tx.store.put(alert);
    }
    await tx.done;
  } catch (err) {
    console.warn('[Storage] saveAlerts failed:', err.message);
  }
}

export async function loadAlerts() {
  const all = await loadAllFromStore(STORES.ALERTS);
  return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function markAlertRead(alertId) {
  try {
    const db = await getDB();
    const alert = await db.get(STORES.ALERTS, alertId);
    if (alert) {
      alert.read = true;
      await db.put(STORES.ALERTS, alert);
    }
  } catch (err) {
    console.warn('[Storage] markAlertRead failed:', err.message);
  }
}

export async function clearAlerts() {
  await clearStore(STORES.ALERTS);
}

export { STORES };
