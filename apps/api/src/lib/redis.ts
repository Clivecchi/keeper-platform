import * as RedisPkg from 'ioredis';

const RedisCtor: any = (RedisPkg as any).default ?? RedisPkg;

export type RedisClient = InstanceType<typeof RedisCtor>;

let client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL missing; set env or set DISABLE_REDIS=true');
  client = new RedisCtor(url);
  return client!;
}


