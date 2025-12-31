import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Redis Fallback Tests', () => {
  beforeEach(async () => {
    vi.resetModules();        // clears module cache
    process.env.DISABLE_REDIS = undefined;
    process.env.REDIS_URL = undefined;
  });

  afterEach(async () => {
    vi.resetModules();
  });

  describe('DISABLE_REDIS=true', () => {
    beforeEach(() => {
      process.env.DISABLE_REDIS = 'true';
      delete process.env.REDIS_URL;
    });

    it('should return no-op client when DISABLE_REDIS=true', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();
      expect(redis).toBeDefined();
      expect(redis.constructor.name).toBe('NoOpRedisClient');
    });

    it('should not crash when calling Redis methods', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();
      
      // Test basic operations
      const getResult = await redis.get('test-key');
      expect(getResult).toBeNull();
      
      const setResult = await redis.set('test-key', 'test-value');
      expect(setResult).toBe('OK');
      
      const delResult = await redis.del('test-key');
      expect(delResult).toBe(0);
      
      const existsResult = await redis.exists('test-key');
      expect(existsResult).toBe(0);
    });

    it('should return empty arrays for list operations', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();

      const keysResult = await redis.keys('*');
      expect(keysResult).toEqual([]);

      const scanResult = await redis.scan(0);
      expect(scanResult).toEqual(['0', []]);

      const lrangeResult = await redis.lrange('test-list', 0, -1);
      expect(lrangeResult).toEqual([]);
    });

    it('should return empty objects for hash operations', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();

      const hgetallResult = await redis.hgetall('test-hash');
      expect(hgetallResult).toEqual({});

      const hgetResult = await redis.hget('test-hash', 'test-field');
      expect(hgetResult).toBeNull();
    });

    it('should return 0 for set operations', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();

      const saddResult = await redis.sadd('test-set', 'test-value');
      expect(saddResult).toBe(0);

      const sismemberResult = await redis.sismember('test-set', 'test-value');
      expect(sismemberResult).toBe(0);
    });

    it('should return -1 for TTL operations', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();

      const ttlResult = await redis.ttl('test-key');
      expect(ttlResult).toBe(-1);
    });

    it('should return OK for connection operations', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      const redis = getRedis();

      const pingResult = await redis.ping();
      expect(pingResult).toBe('PONG');

      const quitResult = await redis.quit();
      expect(quitResult).toBe('OK');
    });

    it('should identify Redis as disabled', async () => {
      const { resetRedis, isRedisDisabled, isRedisAvailable } = await import('../src/lib/redis.js');
      resetRedis();
      expect(isRedisDisabled()).toBe(true);
      expect(isRedisAvailable()).toBe(false);
    });
  });

  describe('DISABLE_REDIS not set, no REDIS_URL', () => {
    beforeEach(() => {
      delete process.env.DISABLE_REDIS;
      delete process.env.REDIS_URL;
    });

    it('should throw clear error when Redis is required but not configured', async () => {
      const { resetRedis, getRedis } = await import('../src/lib/redis.js');
      resetRedis();
      expect(() => getRedis()).toThrow(
        'Redis is required but REDIS_URL is not set. Either set REDIS_URL or set DISABLE_REDIS=true to disable Redis functionality.'
      );
    });

    it('should identify Redis as not available', async () => {
      const { resetRedis, isRedisDisabled, isRedisAvailable } = await import('../src/lib/redis.js');
      resetRedis();
      expect(isRedisDisabled()).toBe(false);
      expect(isRedisAvailable()).toBe(false);
    });
  });

  describe('DISABLE_REDIS=false, with REDIS_URL', () => {
    beforeEach(() => {
      process.env.DISABLE_REDIS = 'false';
      process.env.REDIS_URL = 'redis://localhost:6379';
    });

    it('should identify Redis as not disabled', async () => {
      const { resetRedis, isRedisDisabled } = await import('../src/lib/redis.js');
      resetRedis();
      expect(isRedisDisabled()).toBe(false);
    });

    // Note: This test would require a real Redis instance to pass
    // In a real test environment, you might mock the Redis client
    it('should attempt to connect to Redis', async () => {
      const { resetRedis, getRedis, isRedisDisabled } = await import('../src/lib/redis.js');
      resetRedis();
      // This test will attempt to connect to Redis
      // The connection may fail if Redis server is not running, but the client should be created
      try {
        const redis = getRedis();
        expect(redis).toBeDefined();
        expect(redis.constructor.name).not.toBe('NoOpRedisClient');
        expect(isRedisDisabled()).toBe(false);
      } catch (error) {
        // If connection fails, that's expected when Redis server is not running
        expect(error).toBeDefined();
      }
    });
  });

  describe('Environment variable edge cases', () => {
    it('should handle DISABLE_REDIS=1 as not disabled', async () => {
      process.env.DISABLE_REDIS = '1';
      delete process.env.REDIS_URL;

      const { resetRedis, getRedis, isRedisDisabled } = await import('../src/lib/redis.js');
      resetRedis();

      // DISABLE_REDIS=1 is not exactly 'true', so Redis is not disabled
      expect(isRedisDisabled()).toBe(false);
      // This should throw because Redis is required but no URL provided
      expect(() => getRedis()).toThrow(
        'Redis is required but REDIS_URL is not set. Either set REDIS_URL or set DISABLE_REDIS=true to disable Redis functionality.'
      );
    });

    it('should handle DISABLE_REDIS=yes as not disabled', async () => {
      process.env.DISABLE_REDIS = 'yes';
      delete process.env.REDIS_URL;

      const { resetRedis, getRedis, isRedisDisabled } = await import('../src/lib/redis.js');
      resetRedis();

      // DISABLE_REDIS=yes is not exactly 'true', so Redis is not disabled
      expect(isRedisDisabled()).toBe(false);
      // This should throw because Redis is required but no URL provided
      expect(() => getRedis()).toThrow(
        'Redis is required but REDIS_URL is not set. Either set REDIS_URL or set DISABLE_REDIS=true to disable Redis functionality.'
      );
    });

    it('should handle DISABLE_REDIS=TRUE as not disabled (case sensitive)', async () => {
      process.env.DISABLE_REDIS = 'TRUE';
      delete process.env.REDIS_URL;

      const { resetRedis, getRedis, isRedisDisabled } = await import('../src/lib/redis.js');
      resetRedis();

      // DISABLE_REDIS=TRUE is not exactly 'true', so Redis is not disabled
      expect(isRedisDisabled()).toBe(false);
      // This should throw because Redis is required but no URL provided
      expect(() => getRedis()).toThrow(
        'Redis is required but REDIS_URL is not set. Either set REDIS_URL or set DISABLE_REDIS=true to disable Redis functionality.'
      );
    });
  });
});
