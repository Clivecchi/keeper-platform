import { describe, expect, it } from 'vitest';
import { resolveRealmWhereWeAre, type RealmDomainSignals } from './realmArrival.js';
import type { WhereWeAreDialogInput } from './stageArrival.js';

const ke3pDialogs: WhereWeAreDialogInput[] = [
  {
    id: 'be-speak',
    title: 'Be.Speak.Become',
    titleSource: 'user_set',
    documentStatus: 'kept',
    orientation: '',
    updatedAt: '2026-10-01T01:36:30.702Z',
  },
  {
    id: 'plot',
    title: 'Finding the Plot',
    titleSource: 'user_set',
    documentStatus: 'kept',
    orientation: 'A kept map of the work.',
    orientationUpdatedAt: '2026-09-22T00:28:52.787Z',
    forwardTitle: 'Aligning Keeper Agents with the Keeper Platform',
    forwardDescription: 'A direction.',
    updatedAt: '2026-09-22T00:28:52.788Z',
  },
  {
    id: 'together',
    title: 'Becoming Together',
    titleSource: 'user_set',
    documentStatus: 'drafts',
    orientation: '   ',
    orientationUpdatedAt: '2026-09-22T00:16:26.048Z',
    forwardTitle: 'Becoming Together',
    forwardDescription: 'An authored direction.',
    updatedAt: '2026-09-22T00:16:26.049Z',
  },
];

function domain(partial: RealmDomainSignals): RealmDomainSignals {
  return partial;
}

describe('resolveRealmWhereWeAre', () => {
  it('continues into Domains the existing resolver can name, and keeps the face from deciding', () => {
    const reading = resolveRealmWhereWeAre({
      domains: [
        domain({
          id: 'ke3p',
          slug: 'ke3p',
          name: 'KE3P',
          dialogs: ke3pDialogs,
          stageBeatTitles: ['Dialog. Stage. Deploy.'],
        }),
        domain({
          id: 'chuck',
          slug: 'chuck',
          name: 'Chuck Livecchi',
          face: true,
          dialogs: [
            {
              id: 'go-public',
              title: 'Objective. Go Public',
              titleSource: 'user_set',
              documentStatus: 'kept',
              forwardTitle: 'Go Public',
              forwardDescription: 'A direction.',
              updatedAt: '2026-09-01T00:00:00.000Z',
            },
          ],
          stageBeatTitles: ['Go Public'],
        }),
        domain({
          id: 'liv',
          slug: 'livecchi-biz',
          name: 'liv',
          dialogs: [
            {
              id: 'practice',
              title: 'Professional Services',
              titleSource: 'user_set',
              documentStatus: 'drafts',
              forwardTitle: 'The Practice',
              forwardDescription: 'Written.',
            },
          ],
          stageBeatTitles: ['The Practitioners'],
        }),
        domain({
          id: 'frog',
          slug: 'house-frogmore',
          name: 'House Frogmore',
          dialogs: [
            {
              id: 'yard',
              title: 'Yard Birds',
              titleSource: 'user_set',
              documentStatus: 'drafts',
            },
          ],
        }),
      ],
      feed: [
        {
          id: 'moment-1',
          occurredAt: '2026-10-02T00:00:00.000Z',
          domainName: 'House Frogmore',
          summary: 'A moment was kept.',
        },
      ],
    });

    expect(reading.continuations.map((row) => row.domainName)).toEqual([
      'Chuck Livecchi',
      'KE3P',
    ]);
    expect(reading.face).toEqual({
      domainId: 'chuck',
      domainSlug: 'chuck',
      domainName: 'Chuck Livecchi',
    });
    expect(reading.continuations[0]?.reading.places.map((place) => place.title)).toEqual([
      'Objective. Go Public',
    ]);
    expect(reading.continuations[1]?.reading.places.map((place) => place.title)).toEqual([
      'Finding the Plot',
      'Becoming Together',
      'Be.Speak.Become',
    ]);
    expect(reading.trail.draftForwards.map((row) => row.dialogTitle)).toEqual([
      'Professional Services',
    ]);
    expect(reading.trail.stageBeats.map((row) => row.domainName)).toEqual([
      'Chuck Livecchi',
      'KE3P',
      'liv',
    ]);
    expect(reading.trail.feed.map((row) => row.domainName)).toEqual(['House Frogmore']);
    expect(JSON.stringify(reading)).not.toContain('does not resolve to one Domain');
  });

  it('does not pin the face Domain first', () => {
    const reading = resolveRealmWhereWeAre({
      domains: [
        {
          id: 'z',
          slug: 'zebra',
          name: 'Zebra',
          face: true,
          dialogs: [
            {
              id: 'kept',
              title: 'Kept Place',
              titleSource: 'user_set',
              documentStatus: 'kept',
              updatedAt: '2026-10-01T00:00:00.000Z',
            },
          ],
        },
        {
          id: 'a',
          slug: 'alpha',
          name: 'Alpha',
          dialogs: [
            {
              id: 'other',
              title: 'Other Place',
              titleSource: 'user_set',
              documentStatus: 'kept',
              updatedAt: '2026-10-02T00:00:00.000Z',
            },
          ],
        },
      ],
    });

    expect(reading.continuations.map((row) => row.domainName)).toEqual(['Alpha', 'Zebra']);
    expect(reading.face?.domainName).toBe('Zebra');
  });

  it('does not invent a continuation from the feed alone', () => {
    const reading = resolveRealmWhereWeAre({
      domains: [
        {
          id: 'quiet',
          slug: 'quiet',
          name: 'Quiet',
          dialogs: [],
        },
      ],
      feed: [
        {
          id: 'recent',
          occurredAt: '2026-10-03T00:00:00.000Z',
          domainName: 'Quiet',
          summary: 'A draft is waiting.',
        },
      ],
    });

    expect(reading.continuations).toEqual([]);
    expect(reading.trail.feed).toHaveLength(1);
  });
});
