import Redis from 'ioredis';

export type RedisClient = Redis;

let client: RedisClient | null = null;

export function getRedis(): RedisClient | null {
  if (process.env.DISABLE_REDIS === 'true') return null;
  if (!client && process.env.REDIS_URL) {
    client = new Redis(process.env.REDIS_URL);
  }
  return client;
}


