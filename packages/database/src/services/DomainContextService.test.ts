/**
 * Domain Context Service Tests
 * Tests for scoped domain state management with Redis-based cache safety
 */

import { DomainContextService } from './DomainContextService';

// Mock Redis client for testing
const createMockRedis = (shouldFail = false) => {
  const data = new Map<string, { value: string; ttl?: number }>();
  
  return {
    get: async (key: string) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const item = data.get(key);
      return item ? item.value : null;
    },
    set: async (key: string, value: string, ...args: unknown[]) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const ttl = args[0] === 'EX' ? args[1] : undefined;
      data.set(key, { value, ttl });
      return 'OK';
    },
    del: async (key: string) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const existed = data.has(key);
      data.delete(key);
      return existed ? 1 : 0;
    },
    exists: async (key: string) => {
      if (shouldFail) throw new Error('Redis connection failed');
      return data.has(key) ? 1 : 0;
    },
    mget: async (keys: string[]) => {
      if (shouldFail) throw new Error('Redis connection failed');
      return keys.map(key => {
        const item = data.get(key);
        return item ? item.value : null;
      });
    },
    mset: async (pairs: string[]) => {
      if (shouldFail) throw new Error('Redis connection failed');
      for (let i = 0; i < pairs.length; i += 2) {
        data.set(pairs[i], { value: pairs[i + 1] });
      }
      return 'OK';
    },
    keys: async (pattern: string) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Array.from(data.keys()).filter(key => regex.test(key));
    },
    incrby: async (key: string, by: number) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const current = data.get(key);
      const value = current ? parseInt(current.value) + by : by;
      data.set(key, { value: value.toString() });
      return value;
    },
    expire: async (key: string, ttl: number) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const item = data.get(key);
      if (item) {
        data.set(key, { ...item, ttl });
        return 1;
      }
      return 0;
    },
    ttl: async (key: string) => {
      if (shouldFail) throw new Error('Redis connection failed');
      const item = data.get(key);
      return item?.ttl ?? -1;
    },
    ping: async () => {
      if (shouldFail) throw new Error('Redis connection failed');
      return 'PONG';
    },
    pipeline: () => ({
      expire: (key: string, ttl: number) => {},
      exec: async () => [[null, 1]]
    })
  } as any;
};

console.log('=== Testing DomainContextService ===\n');

// Test basic functionality
console.log('1. Basic Operations:');

async function testBasicOperations() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-123');

  // Test set operation
  const setResult = await service.set('user:preferences', { theme: 'dark', language: 'en' });
  console.log('Set operation:', setResult);

  // Test get operation
  const preferences = await service.get<{ theme: string; language: string }>('user:preferences');
  console.log('Get operation:', preferences);

  // Test exists operation
  const exists = await service.exists('user:preferences');
  console.log('Exists operation:', exists);

  // Test delete operation
  const deleteResult = await service.delete('user:preferences');
  console.log('Delete operation:', deleteResult);

  // Test get after delete
  const afterDelete = await service.get('user:preferences');
  console.log('Get after delete:', afterDelete);
}

await testBasicOperations();
console.log('');

// Test multiple operations
console.log('2. Multiple Operations:');

async function testMultipleOperations() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-456');

  // Test mset operation
  const data = {
    'session:token': 'abc123',
    'session:expires': '2025-01-12T10:00:00Z',
    'session:userId': 'user789'
  };
  
  const msetResult = await service.mset(data, 1800); // 30 minutes TTL
  console.log('Multi-set operation:', msetResult);

  // Test mget operation
  const keys = ['session:token', 'session:expires', 'session:userId', 'nonexistent'];
  const values = await service.mget<string>(keys);
  console.log('Multi-get operation:', values);

  // Test keys operation
  const allKeys = await service.keys('session:*');
  console.log('Keys operation:', allKeys);
}

await testMultipleOperations();
console.log('');

// Test counter operations
console.log('3. Counter Operations:');

async function testCounterOperations() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-789');

  // Test increment
  const count1 = await service.increment('api:calls');
  console.log('First increment:', count1);

  const count2 = await service.increment('api:calls', 5);
  console.log('Increment by 5:', count2);

  const count3 = await service.increment('api:calls');
  console.log('Another increment:', count3);
}

await testCounterOperations();
console.log('');

// Test TTL operations
console.log('4. TTL Operations:');

async function testTTLOperations() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-ttl');

  // Set with TTL
  await service.set('temp:data', { value: 'temporary' }, 60);
  
  // Check TTL
  const ttl = await service.ttl('temp:data');
  console.log('TTL after set:', ttl);

  // Update TTL
  const expireResult = await service.expire('temp:data', 120);
  console.log('Expire operation:', expireResult);

  // Check TTL again
  const newTtl = await service.ttl('temp:data');
  console.log('TTL after expire:', newTtl);
}

await testTTLOperations();
console.log('');

// Test domain scoping
console.log('5. Domain Scoping:');

async function testDomainScoping() {
  const redis = createMockRedis();
  const service1 = new DomainContextService(redis, 'domain-1');
  const service2 = new DomainContextService(redis, 'domain-2');

  // Set data in different domains
  await service1.set('config', { setting: 'value1' });
  await service2.set('config', { setting: 'value2' });

  // Get data from each domain
  const config1 = await service1.get('config');
  const config2 = await service2.get('config');

  console.log('Domain 1 config:', config1);
  console.log('Domain 2 config:', config2);

  // Check keys in each domain
  const keys1 = await service1.keys();
  const keys2 = await service2.keys();

  console.log('Domain 1 keys:', keys1);
  console.log('Domain 2 keys:', keys2);
}

await testDomainScoping();
console.log('');

// Test error handling
console.log('6. Error Handling (Safe Operations):');

async function testErrorHandling() {
  const redis = createMockRedis(true); // Simulate Redis failures
  const service = new DomainContextService(redis, 'test-domain-error', {
    maxRetries: 2,
    enableMetrics: true
  });

  // Test get operation with failure
  const result = await service.get('test:key');
  console.log('Get with Redis failure:', result);

  // Test set operation with failure
  const setResult = await service.set('test:key', 'value');
  console.log('Set with Redis failure:', setResult);

  // Test health check with failure
  const health = await service.healthCheck();
  console.log('Health check with Redis failure:', health);

  // Check metrics after failures
  const metrics = service.getMetrics();
  console.log('Metrics after failures:', metrics);
}

await testErrorHandling();
console.log('');

// Test successful health check
console.log('7. Health Check (Working Redis):');

async function testHealthCheck() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-health');

  const health = await service.healthCheck();
  console.log('Health check result:', health);
}

await testHealthCheck();
console.log('');

// Test metrics
console.log('8. Metrics Tracking:');

async function testMetrics() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-metrics');

  // Perform various operations
  await service.set('key1', 'value1');
  await service.get('key1'); // Hit
  await service.get('key2'); // Miss
  await service.set('key2', 'value2');
  await service.get('key2'); // Hit

  const metrics = service.getMetrics();
  console.log('Final metrics:', metrics);

  // Reset metrics
  service.resetMetrics();
  const resetMetrics = service.getMetrics();
  console.log('Metrics after reset:', resetMetrics);
}

await testMetrics();
console.log('');

// Test clear operation
console.log('9. Clear Operation:');

async function testClearOperation() {
  const redis = createMockRedis();
  const service = new DomainContextService(redis, 'test-domain-clear');

  // Set multiple keys
  await service.set('key1', 'value1');
  await service.set('key2', 'value2');
  await service.set('key3', 'value3');

  console.log('Keys before clear:', await service.keys());

  // Clear all domain data
  const clearResult = await service.clear();
  console.log('Clear operation:', clearResult);

  console.log('Keys after clear:', await service.keys());
}

await testClearOperation();
console.log('');

// Test configuration
console.log('10. Configuration Options:');

async function testConfiguration() {
  const redis = createMockRedis();
  
  // Test with custom configuration
  const service = new DomainContextService(redis, 'test-domain-config', {
    defaultTTL: 7200, // 2 hours
    keyPrefix: 'custom',
    enableMetrics: false,
    maxRetries: 1
  });

  console.log('Domain ID:', service.getDomainId());
  
  // Set without explicit TTL (should use default)
  await service.set('test', 'value');
  
  const metrics = service.getMetrics();
  console.log('Metrics (should be disabled):', metrics);
}

await testConfiguration();

console.log('\n=== All DomainContextService tests completed ==='); 