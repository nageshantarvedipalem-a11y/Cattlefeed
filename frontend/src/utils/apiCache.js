const store = new Map();

export const getCached = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data;
};

export const setCached = (key, data, ttlMs = 60000) => {
  store.set(key, { data, expires: Date.now() + ttlMs });
};

export const invalidateCache = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
