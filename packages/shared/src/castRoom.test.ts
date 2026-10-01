import { describe, expect, it } from 'vitest';
import {
  castRoomEvent,
  parseCastRoomEngage,
  projectCastRoomTrail,
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

  it('requires a slug and an aim before a Lead may engage', () => {
    expect(parseCastRoomEngage({ slug: 'Rendr', aim: 'the look' })).toEqual({
      slug: 'rendr',
      aim: 'the look',
    });
    expect(parseCastRoomEngage({ slug: 'cloud' })).toBeNull();
    expect(parseCastRoomEngage(null)).toBeNull();
  });
});
