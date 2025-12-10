/**
 * Canonical system board identifiers shared across backend and frontend.
 * These slugs map to the logged-in experience screens (Feed, Kip, etc.).
 */

export type CanonicalBoardSlug =
  | 'feed'
  | 'keepers'
  | 'journeys'
  | 'profile'
  | 'kip-agent';

export const CANONICAL_BOARD_SLUGS: readonly CanonicalBoardSlug[] = [
  'feed',
  'keepers',
  'journeys',
  'profile',
  'kip-agent',
] as const;

export function isCanonicalBoardSlug(slug: string): slug is CanonicalBoardSlug {
  return (CANONICAL_BOARD_SLUGS as readonly string[]).includes(slug);
}









