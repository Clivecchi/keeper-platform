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

  it('requires Lock/Open/Next Step cards only for asked or multi-cast synthesis', () => {
    const prompt = buildKeeperCardRenderingPrompt();
    expect(prompt).toContain('The Lock / Open / Next Step summary card is REQUIRED only when:');
    expect(prompt).toContain('the human explicitly asked for a Lock / Open / Next Step style decision summary');
    expect(prompt).toContain('synthesizing an actual multi-Cast consult');
    expect(prompt).toContain('do not emit a generic summary card with inert "Lock:" / "Open:" / "Next Step:" items');
  });

  it('routes optional future keeping acts to keepingChoices, not inert card items', () => {
    const prompt = buildKeeperCardRenderingPrompt();
    expect(prompt).toContain('express it as keepingChoices, not as an inert "Lock:" or "Next Step:" card item');
    expect(prompt).toContain('Do not emit keepingChoices on every relational or reflective turn');
    expect(prompt).toContain('"keepingChoices"');
    expect(prompt).toContain('"card"');
    expect(prompt).toContain('"actions"');
  });
});
