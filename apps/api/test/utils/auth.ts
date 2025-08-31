import jwt from 'jsonwebtoken';

/**
 * Generate access token for testing
 */
export function generateAccessToken(userId: string, domainId?: string): string {
  const payload = {
    userId,
    domainId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  };

  const secret = process.env.JWT_SECRET || 'test-jwt-secret';
  return jwt.sign(payload, secret);
}
