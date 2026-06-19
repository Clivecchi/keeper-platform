/**
 * Board-level capability ceilings — data declarations for UniversalBoardDef.allowedCapabilities.
 * Kept in sync with apps/web UniversalBoardDefinition.ts board defs.
 */

import { IDE_BOARD_MCP_CEILING } from './infraCapabilities.js';

export const BOARD_CAPABILITY_CEILINGS: Record<string, readonly string[]> = {
  ide: [...IDE_BOARD_MCP_CEILING],
  agent: [],
  domain: [],
  designer: [],
};
