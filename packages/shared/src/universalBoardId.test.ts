import { describe, expect, it } from 'vitest';
import {
  BUILD_BOARD_ID,
  isBuildBoardId,
  normalizeUniversalBoardId,
} from './universalBoardId.js';

describe('universalBoardId', () => {
  it('maps legacy ide name to build', () => {
    expect(normalizeUniversalBoardId('ide')).toBe(BUILD_BOARD_ID);
    expect(normalizeUniversalBoardId('build')).toBe(BUILD_BOARD_ID);
    expect(isBuildBoardId('ide')).toBe(true);
    expect(isBuildBoardId('build')).toBe(true);
    expect(isBuildBoardId('domain')).toBe(false);
  });
});
