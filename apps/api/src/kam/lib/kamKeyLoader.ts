/**
 * KAM service key loader
 *
 * Normalizes environment-based KAM service key inputs into a unique list of tokens.
 * Supported envs:
 * - KAM_SERVICE_KEYS: comma-separated list of tokens
 * - KAM_SERVICE_KEY: single token
 */

export function loadKamServiceKeys(): string[] {
  const multiRaw = process.env.KAM_SERVICE_KEYS || '';
  const singleRaw = process.env.KAM_SERVICE_KEY || '';

  const fromMulti = multiRaw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const fromSingle = singleRaw ? [singleRaw.trim()] : [];

  const unique = new Set<string>([...fromMulti, ...fromSingle]);
  return Array.from(unique);
}


