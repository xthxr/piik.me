jest.mock('../redis.utils');

describe('redirect-cache.utils', () => {
  let mockRedisClient;
  let redirectCache;
  let redisUtils;

  beforeEach(() => {
    jest.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    process.env.REDIRECT_CACHE_ENABLED = 'true';
    process.env.REDIRECT_CACHE_TTL_SECONDS = '300';

    redisUtils = require('../redis.utils');

    mockRedisClient = {
      get: jest.fn(),
      pttl: jest.fn(),
      ttl: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };

    redisUtils.getRedisClient.mockReturnValue(mockRedisClient);

    redirectCache = require('../redirect-cache.utils');
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIRECT_CACHE_ENABLED;
    delete process.env.REDIRECT_CACHE_TTL_SECONDS;
  });

  test('set() stores entry in memory and Redis', async () => {
    mockRedisClient.setex.mockResolvedValue('OK');

    const shortCode = 'code1';
    const value = { destination: 'http://example.com' };

    const success = await redirectCache.set(shortCode, value, 60);

    expect(success).toBe(true);
    expect(mockRedisClient.setex).toHaveBeenCalledWith(
      'redirect-cache:code1',
      60,
      JSON.stringify(value)
    );

    // Should hit memory cache on immediate get without calling Redis get
    const result = await redirectCache.get(shortCode);
    expect(result).toEqual(value);
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });

  test('get() on memory miss repopulates memory cache using remaining Redis TTL', async () => {
    jest.useFakeTimers();
    const now = 1000000;
    jest.setSystemTime(now);

    const shortCode = 'code2';
    const redisValue = { destination: 'http://a.com' };

    // Redis has 50,000 ms (50 seconds) remaining
    mockRedisClient.get.mockResolvedValue(JSON.stringify(redisValue));
    mockRedisClient.pttl.mockResolvedValue(50000);

    // Initial memory miss -> fetches from Redis
    const firstGet = await redirectCache.get(shortCode);
    expect(firstGet).toEqual(redisValue);
    expect(mockRedisClient.get).toHaveBeenCalledWith('redirect-cache:code2');
    expect(mockRedisClient.pttl).toHaveBeenCalledWith('redirect-cache:code2');

    // Subsequent call within 50s should hit memory cache (no additional Redis call)
    mockRedisClient.get.mockClear();
    jest.setSystemTime(now + 20000); // T+20s
    const secondGet = await redirectCache.get(shortCode);
    expect(secondGet).toEqual(redisValue);
    expect(mockRedisClient.get).not.toHaveBeenCalled();

    // At T+51s (after 50s TTL has passed), Redis entry is expired and returns null
    jest.setSystemTime(now + 51000); // T+51s
    mockRedisClient.get.mockResolvedValue(null);

    const thirdGet = await redirectCache.get(shortCode);
    // Memory cache should have expired at T+50s and not return stale data!
    expect(thirdGet).toBeNull();
    expect(mockRedisClient.get).toHaveBeenCalledWith('redirect-cache:code2');
  });

  test('get() caps memory TTL at DEFAULT_TTL_SECONDS if Redis TTL is higher', async () => {
    jest.useFakeTimers();
    const now = 1000000;
    jest.setSystemTime(now);

    const shortCode = 'code3';
    const redisValue = { destination: 'http://b.com' };

    // Redis has 600,000 ms (10 min) remaining, DEFAULT_TTL_SECONDS is 300 (5 min)
    mockRedisClient.get.mockResolvedValue(JSON.stringify(redisValue));
    mockRedisClient.pttl.mockResolvedValue(600000);

    await redirectCache.get(shortCode);

    // At T+4 minutes (within 300s default TTL), memory cache should still be valid
    jest.setSystemTime(now + 240000);
    mockRedisClient.get.mockClear();
    const hitMemory = await redirectCache.get(shortCode);
    expect(hitMemory).toEqual(redisValue);
    expect(mockRedisClient.get).not.toHaveBeenCalled();

    // At T+6 minutes (after 300s default TTL), memory cache should expire
    jest.setSystemTime(now + 360000);
    await redirectCache.get(shortCode);
    expect(mockRedisClient.get).toHaveBeenCalledWith('redirect-cache:code3');
  });

  test('get() falls back to DEFAULT_TTL_SECONDS if pttl returns -1 (no TTL set)', async () => {
    jest.useFakeTimers();
    const now = 1000000;
    jest.setSystemTime(now);

    const shortCode = 'code_nottl';
    const redisValue = { destination: 'http://no-ttl.com' };

    mockRedisClient.get.mockResolvedValue(JSON.stringify(redisValue));
    mockRedisClient.pttl.mockResolvedValue(-1);

    await redirectCache.get(shortCode);

    // Should expire after default TTL (300s)
    jest.setSystemTime(now + 290000);
    mockRedisClient.get.mockClear();
    expect(await redirectCache.get(shortCode)).toEqual(redisValue);
    expect(mockRedisClient.get).not.toHaveBeenCalled();

    jest.setSystemTime(now + 301000);
    await redirectCache.get(shortCode);
    expect(mockRedisClient.get).toHaveBeenCalledWith('redirect-cache:code_nottl');
  });

  test('delete() removes entry from memory and Redis', async () => {
    mockRedisClient.setex.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);

    const shortCode = 'code4';
    const value = { destination: 'http://c.com' };

    await redirectCache.set(shortCode, value, 60);
    await redirectCache.delete(shortCode);

    expect(mockRedisClient.del).toHaveBeenCalledWith('redirect-cache:code4');

    // Memory miss after deletion -> attempts Redis read
    mockRedisClient.get.mockResolvedValue(null);
    const result = await redirectCache.get(shortCode);
    expect(result).toBeNull();
    expect(mockRedisClient.get).toHaveBeenCalledWith('redirect-cache:code4');
  });

  test('returns null when CACHE_ENABLED is false', async () => {
    process.env.REDIRECT_CACHE_ENABLED = 'false';

    expect(await redirectCache.get('code5')).toBeNull();
    expect(await redirectCache.set('code5', { destination: 'http://d.com' })).toBe(false);
  });

  test('stats() returns stats object', () => {
    const s = redirectCache.stats();
    expect(s).toEqual({
      enabled: true,
      memoryEntries: 0,
      redisEnabled: true,
    });
  });
});
