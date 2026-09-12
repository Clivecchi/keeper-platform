import { describe, expect, it } from 'vitest';
import {
  buildStageExpressionSystemPrompt,
  buildStageExpressionUserPrompt,
  compactPerformanceSetFromEnvironment,
} from './composeStageExpression.js';

const meaning = {
  meaning: 'Finding the Plot is the Dialog, not a fiction outline.',
  because: 'Cast held the conversation as the story.',
  about: [{ kind: 'dialog' as const, id: 'dlg-1', title: 'Finding the Plot' }],
  performedBy: ['cloud', 'rendr'],
};

describe('buildStageExpressionUserPrompt', () => {
  it('gives Rendr meaning + Set and forbids transcript reinterpretation', () => {
    const prompt = buildStageExpressionUserPrompt({
      resolvedMeaning: meaning,
      set: {
        domainLabel: 'ke3p',
        talkingIn: { kind: 'dialog', title: 'Finding the Plot' },
        workingOn: { kind: 'document', title: 'Finding the Plot' },
        keeperStage: {
          slug: 'keeper',
          title: 'ke3p Stage',
          selectedPresenceId: 'p1',
          objects: [{ kind: 'dialog', objectId: 'dlg-1', title: 'Finding the Plot' }],
          storyTitles: ['Finding the Plot'],
        },
      },
    });
    expect(prompt).toContain(meaning.meaning);
    expect(prompt).toContain('Finding the Plot');
    expect(prompt).toMatch(/exactly one text_slide beat/i);
    expect(prompt).not.toMatch(/castVoices/);
    expect(prompt).not.toMatch(/### Cloud/);
    expect(prompt).toMatch(/Do not emit stage\.story\.layout/);
  });

  it('does not include Document Point bodies', () => {
    const prompt = buildStageExpressionUserPrompt({
      resolvedMeaning: meaning,
      set: { talkingIn: { kind: 'dialog', title: 'Finding the Plot' } },
    });
    expect(prompt).not.toContain('payload.content');
    expect(prompt).not.toContain('DIALOG DOCUMENT');
  });
});

describe('buildStageExpressionSystemPrompt', () => {
  it('locks Rendr identity and one Frame', () => {
    const prompt = buildStageExpressionSystemPrompt();
    expect(prompt).toContain('You are Rendr only');
    expect(prompt).toContain('stage_expression');
    expect(prompt).toMatch(/One Frame/);
  });
});

describe('compactPerformanceSetFromEnvironment', () => {
  it('keeps titles and ids, not Point bodies', () => {
    const compact = compactPerformanceSetFromEnvironment({
      domainName: 'ke3p',
      dialogDocument: {
        dialogId: 'dlg-1',
        title: 'Finding the Plot',
        points: [{ content: 'A long Point body that must not reach Rendr.' }],
      },
      keeperStage: {
        slug: 'keeper',
        title: 'ke3p Stage',
        selectedPresenceId: 'p1',
        presences: [{ kind: 'dialog', objectId: 'dlg-1', title: 'Finding the Plot' }],
        story: { slides: [{ title: 'Cover beat' }] },
      },
    });
    expect(compact.talkingIn?.title).toBe('Finding the Plot');
    expect(compact.keeperStage?.objects[0]?.objectId).toBe('dlg-1');
    expect(JSON.stringify(compact)).not.toContain('A long Point body');
  });
});
