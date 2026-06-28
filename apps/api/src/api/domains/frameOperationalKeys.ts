/**
 * Operational keys that must not ride in boot-time frame_json payloads.
 * Stored in DB until migrated to session/SOLE/Logbook; frozen on write, stripped on GET.
 */
export const FROZEN_FRAME_JSON_KEYS = ['session_notes', 'platform_gaps'] as const;

export type FrozenFrameJsonKey = (typeof FROZEN_FRAME_JSON_KEYS)[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Remove frozen operational keys — for public boot GET responses. */
export function stripOperationalFrameKeys(
  frame: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...frame };
  for (const key of FROZEN_FRAME_JSON_KEYS) {
    delete out[key];
  }
  return out;
}

/** Copy frozen keys from an existing frame (preserve on full replace publish). */
export function pickOperationalFrameKeys(
  frame: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!frame || !isPlainObject(frame)) return {};
  const picked: Record<string, unknown> = {};
  for (const key of FROZEN_FRAME_JSON_KEYS) {
    if (key in frame) {
      picked[key] = frame[key];
    }
  }
  return picked;
}

/** Drop frozen keys from an incoming patch or publish spec — writes are frozen. */
export function omitOperationalFrameKeysFromPatch(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...patch };
  for (const key of FROZEN_FRAME_JSON_KEYS) {
    delete out[key];
  }
  return out;
}

/** True when patch attempted to mutate a frozen top-level key. */
export function patchTouchesFrozenFrameKeys(patch: Record<string, unknown>): boolean {
  return FROZEN_FRAME_JSON_KEYS.some((key) => key in patch);
}
