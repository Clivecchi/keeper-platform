/**
 * Request ID Utility
 * ==================
 * Helper for generating idempotent requestId (UUID v4)
 */

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function isValidRequestId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

