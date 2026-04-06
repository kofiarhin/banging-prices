// Simple in-memory TTL cache — no Redis dependency needed
// Safe for single-process Node (Heroku dynos); scale later to Redis if needed

const store = new Map();

/**
 * Get a cached value. Returns undefined if missing or expired.
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

/**
 * Set a cached value with a TTL in milliseconds.
 */
const set = (key, value, ttlMs) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * Invalidate a cache entry.
 */
const del = (key) => store.delete(key);

/**
 * Wrap an async factory: returns cached value or calls factory and caches result.
 */
const getOrSet = async (key, factory, ttlMs) => {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await factory();
  set(key, value, ttlMs);
  return value;
};

module.exports = { get, set, del, getOrSet };
