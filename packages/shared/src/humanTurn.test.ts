import { describe, expect, it } from 'vitest';
import {
  buildHumanTurnRecord,
  createHumanTurnId,
  isHumanTurnId,
  parseHumanTurnRecord,
  resolveHumanTurnId,
} from './humanTurn.js';

describe('human turn identity', () => {
  it('mints and accepts a UUID Human Turn id', () => {
    const id = createHumanTurnId();
    expect(isHumanTurnId(id)).toBe(true);
    expect(resolveHumanTurnId(id)).toBe(id);
    expect(isHumanTurnId(resolveHumanTurnId('not-a-turn'))).toBe(true);
  });

  it('round-trips a Lead performance record with Cast and Lead generations', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const record = buildHumanTurnRecord({
      id,
      dialogId: 'dialog-1',
      sessionId: 'session-1',
      role: 'lead',
      systemOne: {
        judgedAt: '2026-09-19T20:00:00.000Z',
        evaluatedOnce: true,
        shadow: {
          ok: true,
          model: 'jev-1.13.0',
          answers: { turnPosture: { choice: 'explore', confidence: 0.89 } },
        },
        delivery: {
          audience: 'lead',
          suppliedToLead: true,
          suppliedToCast: false,
          eligible: true,
          available: true,
          model: 'jev-1.13.0',
        },
      },
      cast: [{ slug: 'cloud', attributedTo: 'Cloud', status: 'ok', receivedOrientation: false }],
      leadGenerations: [
        { label: 'lead_main', receivedOrientation: true },
        { label: 'read_follow_up', receivedOrientation: true },
      ],
      actions: [{ type: 'draft.read', status: 'success' }],
    });
    const parsed = parseHumanTurnRecord(record);
    expect(parsed?.id).toBe(id);
    expect(parsed?.version).toBe('human-turn-v0');
    expect(parsed?.systemOne.evaluatedOnce).toBe(true);
    expect(parsed?.systemOne.delivery.suppliedToCast).toBe(false);
    expect(parsed?.cast).toEqual([
      { slug: 'cloud', attributedTo: 'Cloud', status: 'ok', receivedOrientation: false },
    ]);
    expect(parsed?.leadGenerations).toHaveLength(2);
    expect(parsed?.actions[0]).toEqual({ type: 'draft.read', status: 'success' });
  });

  it('rejects a Cast-looking record that is not a Human Turn', () => {
    expect(parseHumanTurnRecord({ version: 'human-turn-v0', id: 'cloud' })).toBeNull();
  });
});
