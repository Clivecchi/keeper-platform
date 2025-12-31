/**
 * Idempotency Middleware
 * ======================
 * Handles requestId-based idempotency for board operations
 * Stores request hashes in memory with 10-minute TTL
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface IdempotencyRecord {
  requestId: string;
  inputHash: string;
  result: any;
  timestamp: number;
}

// In-memory store for idempotency (10 min TTL)
// For production, consider Redis
const idempotencyStore = new Map<string, IdempotencyRecord>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Cleanup expired entries
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of idempotencyStore.entries()) {
    if (now - record.timestamp > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpired, 60 * 1000);

/**
 * Compute a stable hash of the request input
 */
function computeInputHash(body: any): string {
  const str = JSON.stringify(body, Object.keys(body).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Idempotency middleware factory
 * Checks if requestId has been seen before with the same input
 */
export function idempotencyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { requestId, ...restBody } = req.body;

    // If no requestId, skip idempotency check
    if (!requestId) {
      return next();
    }

    // Compute input hash (excluding requestId itself)
    const inputHash = computeInputHash(restBody);
    const storeKey = `${req.path}:${requestId}`;

    // Check if we've seen this request before
    const existing = idempotencyStore.get(storeKey);

    if (existing) {
      // If input hash matches, return cached result
      if (existing.inputHash === inputHash) {
        console.log(`[IDEMPOTENCY] Returning cached result for requestId: ${requestId}`);
        return res.json({
          ...existing.result,
          cached: true,
        });
      } else {
        // Different input with same requestId - conflict
        return res.status(409).json({
          error: 'CONFLICT',
          message: 'RequestId already used with different input',
        });
      }
    }

    // Store the original json method
    const originalJson = res.json.bind(res);

    // Intercept the response to cache it
    res.json = function(body: any) {
      // Only cache successful responses (200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyStore.set(storeKey, {
          requestId,
          inputHash,
          result: body,
          timestamp: Date.now(),
        });
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Clear idempotency cache (for testing)
 */
export function clearIdempotencyCache() {
  idempotencyStore.clear();
}

