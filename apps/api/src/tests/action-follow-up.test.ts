import { describe, expect, it } from 'vitest';
import {
  buildReadActionFollowUpInput,
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
});
