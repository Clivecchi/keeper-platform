import * as RedisPkg from 'ioredis';

const RedisCtor: any = (RedisPkg as any).default ?? RedisPkg;

export type RedisClient = InstanceType<typeof RedisCtor>;

let client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (client) return client;
  
  const url = process.env.REDIS_URL;
  const disableRedis = process.env.DISABLE_REDIS === 'true';
  
  if (!url && !disableRedis) {
    console.warn('REDIS_URL missing and DISABLE_REDIS not set. Using mock Redis client.');
    // Return a mock Redis client for development/testing
    return createMockRedisClient();
  }
  
  if (disableRedis || !url) {
    return createMockRedisClient();
  }
  
  try {
    client = new RedisCtor(url);
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    console.warn('Falling back to mock Redis client');
    return createMockRedisClient();
  }
}

function createMockRedisClient(): RedisClient {
  // Create a minimal mock Redis client that implements basic methods
  const mockClient = {
    ping: async () => 'PONG',
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    exists: async () => 0,
    expire: async () => 1,
    ttl: async () => -1,
    quit: async () => 'OK',
    disconnect: async () => {},
    on: () => mockClient,
    off: () => mockClient,
    once: () => mockClient,
    emit: () => true,
  } as any;
  
  return mockClient;
}


