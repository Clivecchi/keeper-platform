import { describe, expect, it } from 'vitest';
import {
  aimIsSatisfied,
  buildSpecialistAssignmentBlock,
  castRoomEvent,
  classifyActionReceipt,
  continueOrPresent,
  contributionMatchesDirection,
  formatCastRoomTraceLine,
  parseCastRoomEngage,
  parseCastRoomEvents,
  parseLeadAssessment,
  projectCastRoomTrail,
  withActionReceiptsOnTrace,
  CAST_ROOM_DIRECTION_REF,
} from './castRoom.js';

describe('cast room trail', () => {
  it('projects this turn plus the previous turn’s contributed facts', () => {
    const previous = [
      castRoomEvent({
        actor: { kind: 'agent', slug: 'cloud' },
        what: 'contributed',
        humanTurnId: 'prev',
        label: 'earlier contribution',
      }),
      castRoomEvent({
        actor: { kind: 'human' },
        what: 'spoke',
        humanTurnId: 'prev',
        label: 'ignored — not a carried fact',
      }),
    ];
    const current = [
      castRoomEvent({
        actor: { kind: 'human' },
        what: 'spoke',
        humanTurnId: 'now',
        label: 'hello',
      }),
    ];
    const trail = projectCastRoomTrail(current, previous);
    expect(trail).toContain('PRIOR TURN (historical only — not this assignment)');
    expect(trail).toContain('cloud contributed — earlier contribution');
    expect(trail).toContain('THIS TURN:');
    expect(trail).toContain('human spoke — hello');
    expect(trail).not.toContain('ignored');
    const priorAt = trail.indexOf('PRIOR TURN');
    const thisAt = trail.indexOf('THIS TURN');
    expect(priorAt).toBeGreaterThanOrEqual(0);
    expect(thisAt).toBeGreaterThan(priorAt);
  });

  it('places an action receipt on the Trace before the turn resolves', () => {
    const trace = [
      castRoomEvent({
        actor: { kind: 'human' },
        what: 'spoke',
        humanTurnId: 'now',
        label: 'create the story',
      }),
      castRoomEvent({
        actor: { kind: 'runtime' },
        what: 'resolved',
        humanTurnId: 'now',
        label: 'Agency — heard rendr',
      }),
    ];
    const next = withActionReceiptsOnTrace(
      trace,
      [{ type: 'story.save', status: 'success', message: 'Saved the story' }],
      'now',
      'kip',
    );
    expect(next.map((event) => event.what)).toEqual(['spoke', 'acted', 'resolved']);
    expect(formatCastRoomTraceLine(next[1])).toContain('kip acted — story.save — success');
  });

  it('requires a slug and an aim before a Lead may engage', () => {
    expect(parseCastRoomEngage({ slug: 'Rendr', aim: 'the look' })).toEqual({
      slug: 'rendr',
      aim: 'the look',
    });
    expect(parseCastRoomEngage({ slug: 'cloud' })).toBeNull();
    expect(parseCastRoomEngage(null)).toBeNull();
  });
});

describe('direction and contribution', () => {
  it('keeps a contribution only when it cites this direction on this turn', () => {
    const direction = castRoomEvent({
      actor: { kind: 'agent', slug: 'kip' },
      what: 'directed',
      humanTurnId: 'now',
      label: 'cloud: inspect draft.update.propose',
    });
    const contribution = castRoomEvent({
      actor: { kind: 'agent', slug: 'cloud' },
      what: 'contributed',
      humanTurnId: 'now',
      label: 'the handler persists a proposal',
      refs: [{ kind: CAST_ROOM_DIRECTION_REF, id: direction.id }],
    });
    const earlier = castRoomEvent({
      actor: { kind: 'agent', slug: 'cloud' },
      what: 'contributed',
      humanTurnId: 'prev',
      label: 'Railway auth is not broken',
      refs: [{ kind: CAST_ROOM_DIRECTION_REF, id: direction.id }],
    });
    expect(contributionMatchesDirection(contribution, direction)).toBe(true);
    expect(contributionMatchesDirection(earlier, direction)).toBe(false);
    const roundTrip = parseCastRoomEvents([contribution]);
    expect(roundTrip[0]?.refs?.[0]).toEqual({ kind: 'direction', id: direction.id });
  });

  it('does not treat a proposal or an unrelated reply as a completed aim', () => {
    const proposal = classifyActionReceipt({
      type: 'draft.update.propose',
      status: 'success',
      message: 'Proposed Point',
    });
    expect(proposal?.standing).toBe('proposed');
    const treatment = classifyActionReceipt({
      type: 'treatment.propose',
      status: 'success',
      message: 'Proposed a look',
    });
    expect(treatment?.standing).toBe('proposed');
    expect(aimIsSatisfied({
      assessment: { addressesAim: true, evidence: 'receipt', outcome: 'completed' },
      receipts: proposal ? [proposal] : [],
      artifactRequested: false,
    })).toBe(false);
    expect(aimIsSatisfied({
      assessment: { addressesAim: true, evidence: 'receipt', outcome: 'completed' },
      receipts: treatment ? [treatment] : [],
      artifactRequested: false,
    })).toBe(false);
    expect(aimIsSatisfied({
      assessment: { addressesAim: true, evidence: 'observation', outcome: 'completed' },
      receipts: [],
      artifactRequested: false,
    })).toBe(true);
    expect(aimIsSatisfied({
      assessment: { addressesAim: false, evidence: 'observation', outcome: 'completed' },
      receipts: [],
      artifactRequested: false,
    })).toBe(false);
    expect(aimIsSatisfied({
      assessment: parseLeadAssessment({ addressesAim: true, evidence: 'none', outcome: 'completed' }),
      receipts: [],
      artifactRequested: false,
    })).toBe(false);
  });

  it('directs again after a rejected contribution and resolves only when the aim is met', () => {
    expect(continueOrPresent({
      contributionsUsed: 1,
      hasSubstance: true,
      correlated: true,
      failed: false,
      satisfied: false,
      leadBlocked: false,
    })).toEqual({ step: 'direct', resolve: false, outcome: 'unfinished' });
    expect(continueOrPresent({
      contributionsUsed: 1,
      hasSubstance: true,
      correlated: false,
      failed: false,
      satisfied: false,
      leadBlocked: false,
    })).toEqual({ step: 'direct', resolve: false, outcome: 'rejected' });
    expect(continueOrPresent({
      contributionsUsed: 2,
      hasSubstance: false,
      correlated: false,
      failed: true,
      satisfied: false,
      leadBlocked: false,
    })).toEqual({ step: 'present', resolve: false, outcome: 'rejected' });
    expect(continueOrPresent({
      contributionsUsed: 1,
      hasSubstance: true,
      correlated: true,
      failed: false,
      satisfied: true,
      leadBlocked: false,
    })).toEqual({ step: 'present', resolve: true, outcome: 'completed' });
    expect(continueOrPresent({
      contributionsUsed: 1,
      hasSubstance: true,
      correlated: true,
      failed: false,
      satisfied: false,
      leadBlocked: true,
    })).toEqual({ step: 'present', resolve: false, outcome: 'blocked' });
  });

  it('puts the aim ahead of prior trail in the specialist assignment', () => {
    const block = buildSpecialistAssignmentBlock({
      aim: 'inspect draft.update.propose',
      directionId: 'dir-1',
      priorTrail: 'PRIOR TURN (historical only — not this assignment):\ncloud contributed — Railway auth is not broken',
    });
    expect(block).toContain('THIS ASSIGNMENT');
    expect(block).toContain('Direction: dir-1');
    expect(block).toContain('Aim: inspect draft.update.propose');
    expect(block).toContain('not this assignment');
    expect(block.indexOf('Aim:')).toBeLessThan(block.indexOf('Railway'));
  });
});
