export const isDbDisabled = () =>
  process.env.DISABLE_DB === 'true' || !process.env.DATABASE_URL;

export const isRedisDisabled = () =>
  process.env.DISABLE_REDIS === 'true' || !process.env.REDIS_URL;


