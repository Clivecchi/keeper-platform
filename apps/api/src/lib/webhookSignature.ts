/**
 * Inbound webhook signature verification (Railway, Vercel, GitHub).
 */

import crypto from 'crypto';

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function hmacSha256Hex(secret: string, rawBody: Buffer): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

function hmacSha1Hex(secret: string, rawBody: Buffer): string {
  return crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
}

export type WebhookVerifyResult =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 503; error: string };

function missingSecret(provider: string): WebhookVerifyResult {
  return {
    ok: false,
    status: 503,
    error: `${provider} webhook secret is not configured`,
  };
}

/** Railway — HMAC-SHA256 hex in x-railway-signature (optional sha256= prefix). */
export function verifyRailwayWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string | undefined,
): WebhookVerifyResult {
  if (!secret?.trim()) return missingSecret('Railway');
  if (!signatureHeader?.trim()) {
    return { ok: false, status: 401, error: 'Missing x-railway-signature header' };
  }

  const expected = hmacSha256Hex(secret.trim(), rawBody);
  const provided = signatureHeader.trim().replace(/^sha256=/i, '');
  if (!timingSafeEqualHex(provided, expected)) {
    return { ok: false, status: 403, error: 'Invalid Railway webhook signature' };
  }
  return { ok: true };
}

/** Vercel — HMAC-SHA1 hex in x-vercel-signature. */
export function verifyVercelWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string | undefined,
): WebhookVerifyResult {
  if (!secret?.trim()) return missingSecret('Vercel');
  if (!signatureHeader?.trim()) {
    return { ok: false, status: 401, error: 'Missing x-vercel-signature header' };
  }

  const expected = hmacSha1Hex(secret.trim(), rawBody);
  if (!timingSafeEqualHex(signatureHeader.trim(), expected)) {
    return { ok: false, status: 403, error: 'Invalid Vercel webhook signature' };
  }
  return { ok: true };
}

/** GitHub — X-Hub-Signature-256: sha256=<hex>. */
export function verifyGitHubWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string | undefined,
): WebhookVerifyResult {
  if (!secret?.trim()) return missingSecret('GitHub');
  if (!signatureHeader?.trim()) {
    return { ok: false, status: 401, error: 'Missing x-hub-signature-256 header' };
  }

  const prefix = 'sha256=';
  if (!signatureHeader.toLowerCase().startsWith(prefix)) {
    return { ok: false, status: 401, error: 'Invalid x-hub-signature-256 format' };
  }

  const expected = hmacSha256Hex(secret.trim(), rawBody);
  const provided = signatureHeader.slice(prefix.length);
  if (!timingSafeEqualHex(provided, expected)) {
    return { ok: false, status: 403, error: 'Invalid GitHub webhook signature' };
  }
  return { ok: true };
}

/** Test helper — sign payloads for vitest. */
export function signRailwayWebhook(rawBody: Buffer, secret: string): string {
  return hmacSha256Hex(secret, rawBody);
}

export function signVercelWebhook(rawBody: Buffer, secret: string): string {
  return hmacSha1Hex(secret, rawBody);
}

export function signGitHubWebhook(rawBody: Buffer, secret: string): string {
  return `sha256=${hmacSha256Hex(secret, rawBody)}`;
}
