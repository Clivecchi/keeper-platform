/**
 * Board-level capability ceilings — data declarations for UniversalBoardDef.allowedCapabilities.
 * Build Board uses CLOUD_MCP_CEILING (Cloud's list, not an "IDE" identity).
 */

import { BUILD_BOARD_ID, CLOUD_MCP_CEILING, normalizeUniversalBoardId } from '@keeper/shared';

export const BOARD_CAPABILITY_CEILINGS: Record<string, readonly string[]> = {
  [BUILD_BOARD_ID]: [...CLOUD_MCP_CEILING],
  agent: [],
  domain: [],
  realm: [],
  designer: [],
};

export function boardCeilingFor(boardId?: string | null): readonly string[] {
  const id = normalizeUniversalBoardId(boardId);
  if (!id) return [];
  return BOARD_CAPABILITY_CEILINGS[id] ?? [];
}
