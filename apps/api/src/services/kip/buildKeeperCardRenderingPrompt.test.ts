import { describe, expect, it } from 'vitest';
import { KEEPING_CHOICE_STORY_BUILDER_RULE } from '@keeper/shared';
import { buildKeeperCardRenderingPrompt } from './buildKeeperCardRenderingPrompt.js';

describe('buildKeeperCardRenderingPrompt', () => {
  it('includes the story-builder coexistence rule for Keeping Choices', () => {
    const prompt = buildKeeperCardRenderingPrompt();
    expect(prompt).toContain(KEEPING_CHOICE_STORY_BUILDER_RULE);
    expect(prompt).toContain('add a Point');
    expect(prompt).toContain('keepingChoices');
  });
});
