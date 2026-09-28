import { describe, expect, it } from 'vitest';
import {
  buildFramePerformanceSystemPrompt,
  buildFramePerformanceUserPrompt,
  pointBindingFromTurn,
} from './composeFramePerformance.js';

const meaning = {
  meaning: 'The human should hear one telling.',
  about: [{ kind: 'dialog' as const, id: 'dlg-1', title: 'Finding the Plot' }],
  performedBy: ['ceox'],
};

describe('buildFramePerformanceUserPrompt', () => {
  it('gives Rendr meaning and selected lines, not the transcript', () => {
    const prompt = buildFramePerformanceUserPrompt({
      resolvedMeaning: meaning,
      selectedVoices: [{ slug: 'ceox', line: 'You are asking for better editing.' }],
      set: {
        domainLabel: 'ke3p',
        talkingIn: { kind: 'dialog', title: 'Finding the Plot' },
        workingOn: null,
        keeperStage: null,
      },
    });
    expect(prompt).toContain(meaning.meaning);
    expect(prompt).toContain('better editing');
    expect(prompt).toContain('Finding the Plot');
    expect(prompt).not.toMatch(/castVoices/);
    expect(prompt).toMatch(/Do not set title to the Document title/);
    expect(prompt).toMatch(/Do not emit promote/);
    expect(prompt).toMatch(/recommendPresentation/);
  });
});

describe('pointBindingFromTurn', () => {
  it('reads the Point id from a propose receipt', () => {
    const binding = pointBindingFromTurn({
      resolvedMeaning: meaning,
      environment: {
        dialogDocument: { dialogId: 'dlg-1', manuscriptDraftId: 'dr-doc' },
      },
      actionResults: [{ data: { point: { id: 'pt-1' } } }],
    });
    expect(binding.pointId).toBe('pt-1');
    expect(binding.draftId).toBe('dr-doc');
    expect(binding.dialogId).toBe('dlg-1');
  });
});

describe('buildFramePerformanceSystemPrompt', () => {
  it('asks for a Frame Performance and forbids markup and Theatre state', () => {
    const prompt = buildFramePerformanceSystemPrompt();
    expect(prompt).toContain('You are Rendr only');
    expect(prompt).toMatch(/No HTML/);
    expect(prompt).toMatch(/No Theatre/);
    expect(prompt).toMatch(/title is the Point/);
    expect(prompt).toMatch(/beats\[\]\.title/);
    expect(prompt).toMatch(/Do not emit promote/);
    expect(prompt).toMatch(/do not decide that the Dialog becomes presentation/i);
    expect(prompt).toMatch(/recommendPresentation/);
  });
});
