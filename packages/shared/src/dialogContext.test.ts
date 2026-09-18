import { describe, expect, it } from 'vitest';
import {
  buildInvitationArrivalSnapshot,
  formatDialogArrivalForAgent,
  INTRODUCTION_PURPOSE_LEAD_DIRECTION,
  mergeDialogContext,
  parseDialogArrivalContext,
} from './dialogContext.js';

describe('dialogContext', () => {
  it('parses a typed arrival snapshot and keeps seed as lead direction', () => {
    const arrival = buildInvitationArrivalSnapshot({
      invitationId: 'inv-1',
      inviteeUserId: 'user-1',
      inviteeHomeDomainId: 'home-1',
      originDomainId: 'domain-1',
      role: 'bride',
      invitedByUserId: 'owner-1',
      seed: { givenName: 'Sheyenne', relation: 'Chuck’s wife', about: 'Host her as family.' },
    });
    expect(arrival.introductionPurpose).toBe(INTRODUCTION_PURPOSE_LEAD_DIRECTION);
    const merged = mergeDialogContext({ board: 'domain', frame: '', subject: 'keep-me' }, { arrival });
    expect(merged.subject).toBe('keep-me');
    expect(parseDialogArrivalContext(merged)).toEqual(arrival);
    expect(formatDialogArrivalForAgent(arrival)).toContain('not a message the person already sent');
    expect(formatDialogArrivalForAgent(arrival)).toContain('Host her as family.');
  });

  it('does not treat missing arrival as a first Dialog message', () => {
    expect(parseDialogArrivalContext({ board: 'domain', subject: 'hello' })).toBeNull();
  });
});
