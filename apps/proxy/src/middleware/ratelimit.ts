import { Request, Response, NextFunction } from "express";

type RateLimiterOptions = {
  tokensPerSecond: number;
  bucketCapacity: number;
  keySelector?: (req: Request) => string;
};

type Bucket = {
  tokens: number;
  lastRefillMs: number;
};

export function createRateLimiterMiddleware(options: RateLimiterOptions) {
  const { tokensPerSecond, bucketCapacity } = options;
  const keySelector = options.keySelector ?? ((_req) => "global");

  const buckets = new Map<string, Bucket>();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    const key = keySelector(req);
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: bucketCapacity, lastRefillMs: now };
      buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefillMs) / 1000;
    const refill = elapsedSeconds * tokensPerSecond;
    bucket.tokens = Math.min(bucketCapacity, bucket.tokens + refill);
    bucket.lastRefillMs = now;

    if (bucket.tokens < 1) {
      res.setHeader("Retry-After", "1");
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    bucket.tokens -= 1;
    next();
  };
}


