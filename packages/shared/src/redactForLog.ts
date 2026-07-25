/**
 * Redact secrets from values before console / debug capture.
 * Never log JWTs, passwords, or auth headers in plaintext.
 */

const SECRET_KEY_RE =
  /^(token|accessToken|access_token|refreshToken|refresh_token|password|secret|apiKey|api_key|authorization)$/i;

const BEARER_RE = /bearer\s+[a-z0-9._\-]+/gi;
const AUTH_HEADER_RE = /authorization:[^\n]+/gi;
const JWT_RE = /\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\b/g;

export function redactStringForLog(value: string): string {
  return value
    .replace(AUTH_HEADER_RE, 'authorization:<redacted>')
    .replace(BEARER_RE, 'bearer <redacted>')
    .replace(JWT_RE, '<jwt-redacted>');
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[max-depth]';
  if (typeof value === 'string') return redactStringForLog(value);
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactStringForLog(value.message),
    };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactForLog(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY_RE.test(key)) {
        out[key] = '<redacted>';
      } else {
        out[key] = redactForLog(entry, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}
