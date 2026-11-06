'use strict';

/**
 * Remembers a result for `ttlMs` and lets callers share one call that is still running.
 * The live pages refresh every second, so this keeps the database at one query per key
 * per `ttlMs`, however many browsers are open. Failed calls are not remembered.
 */
function createShortCache(ttlMs) {
  const entries = new Map();

  return async function cached(key, load) {
    const entry = entries.get(key);
    if (entry && (entry.pending || Date.now() - entry.storedAt < ttlMs)) {
      return entry.pending || entry.value;
    }

    const pending = load();
    entries.set(key, { pending });
    try {
      const value = await pending;
      entries.set(key, { value, storedAt: Date.now() });
      return value;
    } catch (error) {
      entries.delete(key);
      throw error;
    }
  };
}

module.exports = { createShortCache };
