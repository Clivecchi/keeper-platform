/**
 * Board-level capability ceilings — data declarations for UniversalBoardDef.allowedCapabilities.
 * Kept in sync with apps/web UniversalBoardDefinition.ts board defs.
 */

import { ALL_INFRA_CAPABILITIES } from './infraCapabilities.js';

export const BOARD_CAPABILITY_CEILINGS: Record<string, readonly string[]> = {
  ide: [...ALL_INFRA_CAPABILITIES],
  agent: [],
  domain: [],
  designer: [],
};
