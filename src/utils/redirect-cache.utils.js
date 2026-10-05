const { getRedisClient } = require('./redis.utils');

function getDefaultTtlSeconds() {
  return Number.parseInt(process.env.REDIRECT_CACHE_TTL_SECONDS || '300', 10);
}

function isCacheEnabled() {
  return process.env.REDIRECT_CACHE_ENABLED !== 'false';
}

function isRedisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const memoryCache = new Map();

function getMemoryEntry(shortCode) {
  const entry = memoryCache.get(shortCode);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(shortCode);
    return null;
  }

  return entry.value;
}

async function getRedisEntry(shortCode) {
  if (!isRedisConfigured() || !isCacheEnabled()) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = `redirect-cache:${shortCode}`;

    let getPttlPromise;
    if (typeof client.pttl === 'function') {
      try {
        getPttlPromise = Promise.resolve(client.pttl(key)).catch(() => -1);
      } catch {
        getPttlPromise = Promise.resolve(-1);
      }
    } else if (typeof client.ttl === 'function') {
      try {
        getPttlPromise = Promise.resolve(client.ttl(key))
          .then(s => typeof s === 'number' && s > 0 ? s * 1000 : s)
          .catch(() => -1);
      } catch {
        getPttlPromise = Promise.resolve(-1);
      }
    } else {
      getPttlPromise = Promise.resolve(-1);
    }

    const [value, pttl] = await Promise.all([
      client.get(key),
      getPttlPromise
    ]);

    if (!value) {
      return null;
    }

    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }

    return {
      value: parsedValue,
      pttl: typeof pttl === 'number' ? pttl : -1
    };
  } catch (error) {
    console.error('❌ Failed to read redirect cache from Redis:', error);
    return null;
  }
}

async function setRedisValue(shortCode, value, ttlSeconds = getDefaultTtlSeconds()) {
  if (!isRedisConfigured() || !isCacheEnabled()) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.setex(`redirect-cache:${shortCode}`, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('❌ Failed to write redirect cache to Redis:', error);
    return false;
  }
}

async function deleteRedisValue(shortCode) {
  if (!isRedisConfigured() || !isCacheEnabled()) {
    return false;
  }

  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.del(`redirect-cache:${shortCode}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete redirect cache from Redis:', error);
    return false;
  }
}

async function get(shortCode) {
  if (!isCacheEnabled()) {
    return null;
  }

  const memoryValue = getMemoryEntry(shortCode);
  if (memoryValue) {
    return memoryValue;
  }

  const redisEntry = await getRedisEntry(shortCode);
  if (redisEntry) {
    const { value, pttl } = redisEntry;
    const defaultTtlMs = getDefaultTtlSeconds() * 1000;
    const ttlMs = pttl > 0
      ? Math.min(pttl, defaultTtlMs)
      : defaultTtlMs;

    memoryCache.set(shortCode, {
      value,
      expiresAt: Date.now() + ttlMs
    });

    return value;
  }

  return null;
}

async function set(shortCode, value, ttlSeconds = getDefaultTtlSeconds()) {
  if (!isCacheEnabled()) {
    return false;
  }

  memoryCache.set(shortCode, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });

  await setRedisValue(shortCode, value, ttlSeconds);
  return true;
}

async function del(shortCode) {
  memoryCache.delete(shortCode);
  await deleteRedisValue(shortCode);
  return true;
}

function stats() {
  return {
    enabled: isCacheEnabled(),
    memoryEntries: memoryCache.size,
    redisEnabled: isRedisConfigured()
  };
}

module.exports = {
  get,
  set,
  delete: del,
  stats
};