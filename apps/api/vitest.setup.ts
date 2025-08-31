// Force safe test env
process.env.NODE_ENV = 'test';
process.env.DISABLE_REDIS ??= 'true';
process.env.JWT_SECRET ??= 'test-secret';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/testdb?schema=public';
process.env.REDIS_URL ??= 'redis://localhost:6379';


