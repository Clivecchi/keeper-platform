// Test setup for Vitest
import { beforeAll, afterEach } from 'vitest';

// Clear environment variables before each test
afterEach(() => {
  delete process.env.DISABLE_REDIS;
  delete process.env.REDIS_URL;
});

// Global test setup
beforeAll(() => {
  // Ensure we're in test environment
  process.env.NODE_ENV = 'test';
});
