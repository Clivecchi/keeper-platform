import * as RedisPkg from 'ioredis';

const RedisCtor: any = (RedisPkg as any).default ?? RedisPkg;

export type RedisClient = InstanceType<typeof RedisCtor>;

// No-op Redis adapter when DISABLE_REDIS=true
export class NoOpRedisClient {
  private disabled = true;

  constructor() {
    console.warn('Redis disabled via DISABLE_REDIS=true - using no-op adapter');
  }

  // Basic Redis methods that resolve immediately
  async get(): Promise<null> { return null; }
  async set(): Promise<'OK'> { return 'OK'; }
  async del(): Promise<0> { return 0; }
  async exists(): Promise<0> { return 0; }
  async expire(): Promise<0> { return 0; }
  async ttl(): Promise<-1> { return -1; }
  async keys(): Promise<string[]> { return []; }
  async scan(): Promise<[string, string[]]> { return ['0', []]; }
  async hget(): Promise<null> { return null; }
  async hset(): Promise<0> { return 0; }
  async hdel(): Promise<0> { return 0; }
  async hgetall(): Promise<Record<string, string>> { return {}; }
  async lpush(): Promise<0> { return 0; }
  async rpush(): Promise<0> { return 0; }
  async lpop(): Promise<null> { return null; }
  async rpop(): Promise<null> { return null; }
  async lrange(): Promise<string[]> { return []; }
  async llen(): Promise<0> { return 0; }
  async sadd(): Promise<0> { return 0; }
  async srem(): Promise<0> { return 0; }
  async smembers(): Promise<string[]> { return []; }
  async sismember(): Promise<0> { return 0; }
  async zadd(): Promise<0> { return 0; }
  async zrem(): Promise<0> { return 0; }
  async zrange(): Promise<string[]> { return []; }
  async zscore(): Promise<null> { return null; }
  async publish(): Promise<0> { return 0; }
  async subscribe(): Promise<0> { return 0; }
  async unsubscribe(): Promise<0> { return 0; }
  async psubscribe(): Promise<0> { return 0; }
  async punsubscribe(): Promise<0> { return 0; }
  async on(): Promise<this> { return this; }
  async off(): Promise<this> { return this; }
  async once(): Promise<this> { return this; }
  async quit(): Promise<'OK'> { return 'OK'; }
  async disconnect(): Promise<void> { return; }
  async connect(): Promise<void> { return; }
  async select(): Promise<'OK'> { return 'OK'; }
  async flushdb(): Promise<'OK'> { return 'OK'; }
  async flushall(): Promise<'OK'> { return 'OK'; }
  async info(): Promise<string> { return ''; }
  async ping(): Promise<'PONG'> { return 'PONG'; }
  async echo(): Promise<string> { return ''; }
  async time(): Promise<[string, string]> { return ['0', '0']; }
  async dbsize(): Promise<0> { return 0; }
  async bgrewriteaof(): Promise<'OK'> { return 'OK'; }
  async bgsave(): Promise<'OK'> { return 'OK'; }
  async save(): Promise<'OK'> { return 'OK'; }
  async lastsave(): Promise<0> { return 0; }
  async shutdown(): Promise<'OK'> { return 'OK'; }
  async slaveof(): Promise<'OK'> { return 'OK'; }
  async slowlog(): Promise<any[]> { return []; }
  async config(): Promise<any> { return {}; }
  async client(): Promise<any> { return {}; }
  async role(): Promise<any[]> { return []; }
  async debug(): Promise<'OK'> { return 'OK'; }
  async monitor(): Promise<void> { return; }
  async sync(): Promise<void> { return; }
  async psync(): Promise<void> { return; }
  async replconf(): Promise<'OK'> { return 'OK'; }
  async restore(): Promise<'OK'> { return 'OK'; }
  async migrate(): Promise<'OK'> { return 'OK'; }
  async dump(): Promise<null> { return null; }
  async object(): Promise<any> { return {}; }
  async memory(): Promise<any> { return {}; }
  async latency(): Promise<any> { return {}; }
  async cluster(): Promise<any> { return {}; }
  async readonly(): Promise<'OK'> { return 'OK'; }
  async readwrite(): Promise<'OK'> { return 'OK'; }
  async geoadd(): Promise<0> { return 0; }
  async geodist(): Promise<null> { return null; }
  async geohash(): Promise<string[]> { return []; }
  async geopos(): Promise<[number, number][]> { return []; }
  async georadius(): Promise<string[]> { return []; }
  async georadiusbymember(): Promise<string[]> { return []; }
  async pfadd(): Promise<0> { return 0; }
  async pfcount(): Promise<0> { return 0; }
  async pfmerge(): Promise<'OK'> { return 'OK'; }
  async pfselftest(): Promise<'OK'> { return 'OK'; }
  async bitcount(): Promise<0> { return 0; }
  async bitfield(): Promise<any[]> { return []; }
  async bitop(): Promise<0> { return 0; }
  async bitpos(): Promise<-1> { return -1; }
  async getbit(): Promise<0> { return 0; }
  async setbit(): Promise<0> { return 0; }
  async getrange(): Promise<string> { return ''; }
  async setrange(): Promise<0> { return 0; }
  async strlen(): Promise<0> { return 0; }
  async incr(): Promise<0> { return 0; }
  async incrby(): Promise<0> { return 0; }
  async incrbyfloat(): Promise<0> { return 0; }
  async decr(): Promise<0> { return 0; }
  async decrby(): Promise<0> { return 0; }
  async mget(): Promise<(string | null)[]> { return []; }
  async mset(): Promise<'OK'> { return 'OK'; }
  async msetnx(): Promise<0> { return 0; }
  async append(): Promise<0> { return 0; }
  async substr(): Promise<string> { return ''; }
  async sort(): Promise<string[]> { return []; }
  async watch(): Promise<'OK'> { return 'OK'; }
  async unwatch(): Promise<'OK'> { return 'OK'; }
  async exec(): Promise<any[]> { return []; }
  async discard(): Promise<'OK'> { return 'OK'; }
  async multi(): Promise<this> { return this; }
  async pipeline(): Promise<this> { return this; }
  async transaction(): Promise<this> { return this; }
  async eval(): Promise<any> { return null; }
  async evalsha(): Promise<any> { return null; }
  async script(): Promise<any> { return null; }
  async auth(): Promise<'OK'> { return 'OK'; }
  async swapdb(): Promise<'OK'> { return 'OK'; }
  async move(): Promise<0> { return 0; }
  async rename(): Promise<'OK'> { return 'OK'; }
  async renamenx(): Promise<0> { return 0; }
  async randomkey(): Promise<null> { return null; }
  async type(): Promise<string> { return 'none'; }
  async wait(): Promise<0> { return 0; }
  async command(): Promise<any[]> { return []; }
  async commands(): Promise<any[]> { return []; }
}

// Union type for Redis client - can be either real Redis or no-op
export type RedisClientOrNoOp = RedisClient | NoOpRedisClient;

let client: RedisClientOrNoOp | null = null;

// Function to reset the Redis client cache (useful for testing)
export function resetRedis(): void {
  if (client && !(client instanceof NoOpRedisClient)) {
    try {
      client.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  }
  client = null;
}

export function getRedis(): RedisClientOrNoOp {
  if (client) return client;

  // Check if Redis is disabled
  if (process.env.DISABLE_REDIS === 'true') {
    client = new NoOpRedisClient();
    return client;
  }

  // Redis is enabled but no URL provided
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      'Redis is required but REDIS_URL is not set. ' +
      'Either set REDIS_URL or set DISABLE_REDIS=true to disable Redis functionality.'
    );
  }

  // Initialize Redis client
  try {
    client = new RedisCtor(url);
    
    // Add error handling
    client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    client.on('connect', () => {
      console.log('Redis connected successfully');
    });
    
    return client;
  } catch (error) {
    throw new Error(
      `Failed to initialize Redis client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Helper to check if Redis is disabled
export function isRedisDisabled(): boolean {
  return process.env.DISABLE_REDIS === 'true';
}

// Helper to check if Redis is available (not disabled and connected)
export function isRedisAvailable(): boolean {
  if (isRedisDisabled()) return false;
  try {
    const redis = getRedis();
    return redis instanceof NoOpRedisClient ? false : true;
  } catch {
    return false;
  }
}

// Helper to check if a Redis client is the no-op version
export function isNoOpRedis(client: RedisClientOrNoOp): client is NoOpRedisClient {
  return client instanceof NoOpRedisClient;
}


