/**
 * Universal Board ids — Build is a Board. `ide` was a name.
 * Normalize at URL / frame-JSON edges only. Runtime uses `build`.
 */

export const BUILD_BOARD_ID = 'build' as const;

/** Legacy Board name. Accept on inbound URLs and stale frame JSON only. */
export const LEGACY_BUILD_BOARD_ALIAS = 'ide' as const;

export function normalizeUniversalBoardId(id: string | null | undefined): string | null {
  if (!id || !id.trim()) return null;
  const trimmed = id.trim();
  return trimmed === LEGACY_BUILD_BOARD_ALIAS ? BUILD_BOARD_ID : trimmed;
}

export function isBuildBoardId(id: string | null | undefined): boolean {
  return normalizeUniversalBoardId(id) === BUILD_BOARD_ID;
}
