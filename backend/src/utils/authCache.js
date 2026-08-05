const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

export const getCachedUser = (userId) => {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(userId);
    return null;
  }
  return entry.user;
};

export const setCachedUser = (userId, user) => {
  cache.set(userId, { user, expires: Date.now() + TTL_MS });
};

export const invalidateCachedUser = (userId) => {
  cache.delete(userId);
};
