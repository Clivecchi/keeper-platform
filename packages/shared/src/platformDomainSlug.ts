/**
 * Canonical platform domain tag and legacy alias during default → ke3p migration.
 */

export const PLATFORM_DOMAIN_SLUG = 'ke3p' as const;

export const LEGACY_PLATFORM_DOMAIN_SLUG = 'default' as const;

export function isPlatformDomainSlugAlias(slug: string | null | undefined): boolean {
  const normalized = slug?.trim().toLowerCase();
  return (
    normalized === PLATFORM_DOMAIN_SLUG ||
    normalized === LEGACY_PLATFORM_DOMAIN_SLUG
  );
}

/** Slug lookup order — tries canonical tag first, then legacy. */
export function expandPlatformDomainSlugCandidates(slug: string): readonly string[] {
  const normalized = slug.trim().toLowerCase();
  if (isPlatformDomainSlugAlias(normalized)) {
    return [PLATFORM_DOMAIN_SLUG, LEGACY_PLATFORM_DOMAIN_SLUG];
  }
  return [normalized];
}

/** Map legacy platform slug in URLs to the canonical tag. */
export function normalizePlatformDomainSlug(
  slug: string | null | undefined,
): string | null {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === LEGACY_PLATFORM_DOMAIN_SLUG) return PLATFORM_DOMAIN_SLUG;
  return normalized;
}
