/**
 * Domain pricing tier flags — controls which key resolution layers are allowed
 * and how AI access is summarized in realm-facing UI.
 *
 * Stored on `domain.settings.tier` (fallback: slug `default` → studio, else free).
 */

export const DOMAIN_TIER_IDS = ['free', 'keeper', 'studio'] as const;

export type DomainTierId = (typeof DOMAIN_TIER_IDS)[number];

export type DomainKeySourceKind = 'env' | 'user' | 'platform';

export interface DomainTierKeyPolicy {
  /** Platform / env included capacity (never exposed as secrets in UI). */
  allowIncludedAccess: boolean;
  /** Domain-owned BYOK keys (user-sourced presence + kip_user_keys). */
  allowDomainKeys: boolean;
  /** Cross-realm shared pool grants — reserved for future tier benefits. */
  allowSharedPool: boolean;
}

export interface DomainTierDefinition {
  id: DomainTierId;
  label: string;
  description: string;
  keyPolicy: DomainTierKeyPolicy;
}

export interface ParseDomainTierInput {
  settings?: unknown;
  features?: unknown;
  slug?: string | null;
}

export const DOMAIN_TIER_DEFINITIONS: Record<DomainTierId, DomainTierDefinition> = {
  free: {
    id: 'free',
    label: 'Free',
    description: 'Included AI access on shared platform capacity.',
    keyPolicy: {
      allowIncludedAccess: true,
      allowDomainKeys: false,
      allowSharedPool: false,
    },
  },
  keeper: {
    id: 'keeper',
    label: 'Keeper',
    description: 'Included access plus your own provider keys (BYOK).',
    keyPolicy: {
      allowIncludedAccess: true,
      allowDomainKeys: true,
      allowSharedPool: false,
    },
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    description: 'Platform workspace — full included access and BYOK.',
    keyPolicy: {
      allowIncludedAccess: true,
      allowDomainKeys: true,
      allowSharedPool: true,
    },
  },
};

export function isDomainTierId(value: unknown): value is DomainTierId {
  return typeof value === 'string' && (DOMAIN_TIER_IDS as readonly string[]).includes(value);
}

function readTierFromRecord(record: unknown): DomainTierId | null {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  const tier = (record as Record<string, unknown>).tier;
  return isDomainTierId(tier) ? tier : null;
}

/** Resolve tier from domain settings/features with slug fallback. */
export function parseDomainTier(input: ParseDomainTierInput): DomainTierId {
  const fromSettings = readTierFromRecord(input.settings);
  if (fromSettings) return fromSettings;

  const fromFeatures = readTierFromRecord(input.features);
  if (fromFeatures) return fromFeatures;

  if (input.slug === 'default') return 'studio';

  return 'free';
}

export function getDomainTierDefinition(tier: DomainTierId): DomainTierDefinition {
  return DOMAIN_TIER_DEFINITIONS[tier];
}

export function getDomainTierKeyPolicy(tier: DomainTierId): DomainTierKeyPolicy {
  return getDomainTierDefinition(tier).keyPolicy;
}

export function isKeySourceAllowedForTier(
  keySource: string,
  policy: DomainTierKeyPolicy,
): boolean {
  if (keySource === 'user') return policy.allowDomainKeys;
  if (keySource === 'platform' || keySource === 'env') return policy.allowIncludedAccess;
  return false;
}

export type TierAwareProviderKey = {
  key: string | null;
  source: DomainKeySourceKind | 'none';
};

/** Gate a resolved provider key by tier policy (runtime enforcement). */
export function applyTierToResolvedProviderKey<T extends TierAwareProviderKey>(
  resolved: T,
  policy: DomainTierKeyPolicy,
): T {
  if (!resolved.key || resolved.source === 'none') {
    return { ...resolved, key: null, source: 'none' } as T;
  }
  if (!isKeySourceAllowedForTier(resolved.source, policy)) {
    return { ...resolved, key: null, source: 'none' } as T;
  }
  return resolved;
}

/** Default settings merge for newly created personal domains. */
export function defaultDomainSettingsForCreate(
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    tier: 'free' satisfies DomainTierId,
    ...(existing ?? {}),
  };
}
