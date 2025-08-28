// Debug script to show Redis caching issue
import { getRedis, resetRedis, isRedisDisabled } from './dist/lib/redis.js';

console.log('🔍 Debugging Redis Caching Issue...\n');

// Test 1: Start with DISABLE_REDIS=true
console.log('📋 Test 1: DISABLE_REDIS=true');
process.env.DISABLE_REDIS = 'true';
delete process.env.REDIS_URL;

const redis1 = getRedis();
console.log(`   Client type: ${redis1.constructor.name}`);
console.log(`   isRedisDisabled(): ${isRedisDisabled()}`);

// Test 2: Change environment but don't reset
console.log('\n📋 Test 2: Change to no DISABLE_REDIS, no REDIS_URL (without reset)');
delete process.env.DISABLE_REDIS;
delete process.env.REDIS_URL;

try {
  const redis2 = getRedis();
  console.log(`   Client type: ${redis2.constructor.name}`);
  console.log(`   isRedisDisabled(): ${isRedisDisabled()}`);
  console.log(`   Same client instance? ${redis1 === redis2}`);
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

// Test 3: Reset and try again
console.log('\n📋 Test 3: Reset and try again');
resetRedis();
delete process.env.DISABLE_REDIS;
delete process.env.REDIS_URL;

try {
  const redis3 = getRedis();
  console.log(`   Client type: ${redis3.constructor.name}`);
  console.log(`   isRedisDisabled(): ${isRedisDisabled()}`);
  console.log(`   Same client instance? ${redis1 === redis3}`);
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

console.log('\n🎯 The issue: Redis client is cached and never re-evaluates environment variables!');
