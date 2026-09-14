import { describe, expect, it } from 'vitest';
import { buildCompactEnvironmentForPrompt } from './buildCompactEnvironmentForPrompt.js';

describe('buildCompactEnvironmentForPrompt', () => {
  it('keeps Agent Board inspection and training context for Composer', () => {
    const compact = buildCompactEnvironmentForPrompt({
      version: 'env-v1',
      agentContext: {
        boardId: 'agent',
        dialogCueing: 'monologue',
        agentTraining: { frame: 'currently', agentName: 'Kip' },
        agentPerformanceInspection: {
          agentName: 'Kip',
          dialogTitle: 'Finding the Plot',
        },
        secretPrompt: 'should-not-pass',
      },
    });
    expect(compact?.agentContext?.boardId).toBe('agent');
    expect(compact?.agentContext?.dialogCueing).toBe('monologue');
    expect(compact?.agentContext?.agentTraining).toEqual({
      frame: 'currently',
      agentName: 'Kip',
    });
    expect(compact?.agentContext?.agentPerformanceInspection).toEqual({
      agentName: 'Kip',
      dialogTitle: 'Finding the Plot',
    });
    expect(compact?.agentContext?.secretPrompt).toBeUndefined();
  });

  it('passes invitation people notes into the compact prompt', () => {
    const compact = buildCompactEnvironmentForPrompt({
      version: 'env-v1',
      peopleNotes: [
        {
          email: 'pat@example.com',
          role: 'friend',
          status: 'pending',
          seed: { givenName: 'Pat', about: 'Knows Cover.' },
        },
      ],
    });
    expect(compact?.peopleNotes).toEqual([
      {
        email: 'pat@example.com',
        role: 'friend',
        status: 'pending',
        seed: { givenName: 'Pat', about: 'Knows Cover.' },
      },
    ]);
  });
});
