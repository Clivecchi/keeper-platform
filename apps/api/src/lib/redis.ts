import * as RedisPkg from 'ioredis';

const RedisCtor: any = (RedisPkg as any).default ?? RedisPkg;

export type RedisClient = InstanceType<typeof RedisCtor>;

let client: RedisClient | null = null;
let initializationAttempted = false;

export function getRedis(): RedisClient {
  if (client) return client;
  
  // Only attempt initialization once
  if (initializationAttempted) {
    throw new Error('Redis initialization failed. Check your environment configuration.');
  }
  
  initializationAttempted = true;
  
  const url = process.env.REDIS_URL;
  const disableRedis = process.env.DISABLE_REDIS === 'true';
  
  if (disableRedis) {
    throw new Error('Redis is disabled via DISABLE_REDIS=true. Update your code to handle Redis unavailability.');
  }
  
  if (!url) {
    throw new Error(
      'REDIS_URL environment variable is missing. ' +
      'Set REDIS_URL to your Redis connection string in Railway environment variables, ' +
      'or set DISABLE_REDIS=true if Redis is not required for this deployment.'
    );
  }
  
  try {
    client = new RedisCtor(url);
    return client;
  } catch (error) {
    throw new Error(
      `Failed to connect to Redis at ${url}: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Check your Redis connection string and ensure Redis is accessible.'
    );
  }
}

// Lazy initialization function for middleware
export function getRedisLazy(): RedisClient | null {
  try {
    return getRedis();
  } catch (error) {
    console.warn('Redis not available, continuing without caching:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}


