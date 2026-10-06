import { describe, expect, it } from 'vitest';
import {
  castRoomEvent,
  formatCastRoomTraceLine,
  parseCastRoomEngage,
  projectCastRoomTrail,
  withActionReceiptsOnTrace,
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
    expect(trail).toContain('cloud contributed — earlier contribution');
    expect(trail).toContain('human spoke — hello');
    expect(trail).not.toContain('ignored');
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
