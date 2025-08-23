import Redis from 'ioredis';
import type { Redis as IORedis } from 'ioredis';
let _client: IORedis | null = null;
export type RedisClient = IORedis;
export function getRedis(): RedisClient {
  if (_client) return _client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL not set and Redis required');
  _client = new Redis(url, { lazyConnect: true });
  return _client;
}


