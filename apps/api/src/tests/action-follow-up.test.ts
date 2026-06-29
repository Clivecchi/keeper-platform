import { describe, expect, it } from 'vitest';
import {
  buildMutationDeferralFollowUpInput,
  buildReadActionFollowUpInput,
  shouldRunMutationDeferralFollowUp,
  shouldRunReadActionFollowUp,
} from '../services/kip/actionFollowUp.js';

describe('actionFollowUp', () => {
  it('runs follow-up when turn is read-only and at least one read succeeded', () => {
    expect(
      shouldRunReadActionFollowUp(
        [{ type: 'draft.read' }],
        [{ type: 'draft.read', status: 'success', message: 'ok' }],
      ),
    ).toBe(true);
  });

  it('skips follow-up when write actions are present', () => {
    expect(
      shouldRunReadActionFollowUp(
        [{ type: 'draft.read' }, { type: 'draft.update.propose' }],
        [
          { type: 'draft.read', status: 'success', message: 'ok' },
          { type: 'draft.update.propose', status: 'success', message: 'ok' },
        ],
      ),
    ).toBe(false);
  });

  it('builds follow-up input that tells the model to complete engagement', () => {
    const input = buildReadActionFollowUpInput({
      originalInput: 'Review this session and rebuild the draft',
      agentName: 'Kip',
      priorResponseText: 'Reading the active draft now.',
      actionResults: [
        {
          type: 'draft.read',
          status: 'success',
          message: 'Draft retrieved successfully',
          data: {
            draft: { id: 'd1', title: 'The Future We Are Building', kind: 'journey_spec', key: 'future' },
            spec: { points: [] },
            summary: 'A living story',
          },
        },
      ],
    });

    expect(input).toContain('The Future We Are Building');
    expect(input).toContain('spec.points: []');
    expect(input).toContain('complete the engagement');
  });

  it('runs mutation deferral follow-up when user asked for draft work and model deferred', () => {
    expect(
      shouldRunMutationDeferralFollowUp({
        userInput: 'Move platform gap into a new draft and keep the opening sequence clean.',
        responseText: "So here's what I'm doing — pulling everything into a separate draft. Give me a moment.",
        actions: [],
      }),
    ).toBe(true);
  });

  it('skips mutation deferral when draft actions were emitted', () => {
    expect(
      shouldRunMutationDeferralFollowUp({
        userInput: 'Create a new draft for platform gaps.',
        responseText: 'Done — new draft created.',
        actions: [{ type: 'draft.create' }],
      }),
    ).toBe(false);
  });

  it('builds mutation deferral input that forbids another deferral', () => {
    const input = buildMutationDeferralFollowUpInput({
      originalInput: 'Split platform notes into a separate draft.',
      agentName: 'Kip',
      priorResponseText: 'Give me a moment while I pull that out.',
    });
    expect(input).toContain('Do NOT defer again');
    expect(input).toContain('draft.create');
  });
});
