import { describe, expect, it } from 'vitest';
import { resolveStagePresentation, resolveWhereWeAre, type WhereWeAreDialogInput } from './stageArrival.js';

const ke3pDialogs: WhereWeAreDialogInput[] = [
  {
    id: 'be-speak',
    title: 'Be.Speak.Become',
    titleSource: 'user_set',
    documentStatus: 'kept',
    orientation: '',
    updatedAt: '2026-10-01T01:36:30.702Z',
    chronicleCount: 99,
  },
  {
    id: 'chatter',
    title: 'Build · conversation · Aug 26',
    titleSource: 'auto_generated',
    documentStatus: 'drafts',
    updatedAt: '2026-09-26T21:00:19.944Z',
    chronicleCount: 4,
  },
  {
    id: 'plot',
    title: 'Finding the Plot',
    titleSource: 'user_set',
    documentStatus: 'kept',
    orientation: 'A kept map of the work.',
    orientationUpdatedAt: '2026-09-22T00:28:52.787Z',
    orientationUpdatedBy: 'Kip',
    forwardTitle: 'Aligning Keeper Agents with the Keeper Platform',
    forwardDescription: 'A direction.',
    updatedAt: '2026-09-22T00:28:52.788Z',
    chronicleCount: 225,
  },
  {
    id: 'together',
    title: 'Becoming Together',
    titleSource: 'user_set',
    documentStatus: 'drafts',
    orientation: '   ',
    orientationUpdatedAt: '2026-09-22T00:16:26.048Z',
    orientationUpdatedBy: 'Chuck Livecchi',
    forwardTitle: 'Becoming Together',
    forwardDescription: 'An authored direction.',
    updatedAt: '2026-09-22T00:16:26.049Z',
    chronicleCount: 110,
  },
];

describe('resolveStagePresentation', () => {
  it('shows where-we-are for an arriving admin', () => {
    expect(resolveStagePresentation({ audience: 'admin', arriving: true })).toBe('where-we-are');
  });

  it('shows the story for everyone else', () => {
    expect(resolveStagePresentation({ audience: 'admin', arriving: false })).toBe('story');
    expect(resolveStagePresentation({ audience: 'keeper', arriving: true })).toBe('story');
    expect(resolveStagePresentation({ audience: 'friend', arriving: true })).toBe('story');
    expect(resolveStagePresentation({ audience: 'guest', arriving: false })).toBe('story');
  });
});

describe('resolveWhereWeAre', () => {
  it('keeps KE3P unresolved across three stored facts', () => {
    const reading = resolveWhereWeAre({
      dialogs: ke3pDialogs,
      stageBeatTitles: ['Dialog. Stage. Deploy.', 'Concrete Failure'],
    });

    expect(reading.places.map((place) => place.title)).toEqual([
      'Finding the Plot',
      'Becoming Together',
      'Be.Speak.Become',
    ]);
    expect(reading.claims.map((claim) => claim.kind)).toEqual([
      'kept-orientation',
      'cleared-orientation-with-forward',
      'recent-kept-dialog',
    ]);
    expect(reading.trail.chatterTitles).toEqual(['Build · conversation · Aug 26']);
    expect(reading.trail.stageBeatTitles).toEqual([
      'Dialog. Stage. Deploy.',
      'Concrete Failure',
    ]);
    expect(reading.trail.history[0]).toMatchObject({ title: 'Finding the Plot', count: 225 });
  });

  it('does not treat an empty Orientation without a clear stamp as cleared', () => {
    const reading = resolveWhereWeAre({
      dialogs: [
        {
          id: 'open',
          title: 'Open work',
          titleSource: 'user_set',
          documentStatus: 'drafts',
          orientation: '',
          forwardTitle: 'Somewhere',
          forwardDescription: 'Written.',
        },
      ],
    });
    expect(reading.claims).toEqual([]);
    expect(reading.places).toEqual([]);
  });

  it('resolves when every claim names the same Dialog', () => {
    const reading = resolveWhereWeAre({
      dialogs: [
        {
          id: 'one',
          title: 'Only Place',
          titleSource: 'user_set',
          documentStatus: 'kept',
          orientation: 'The map.',
          orientationUpdatedAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    });
    expect(reading.places).toEqual([{ dialogId: 'one', title: 'Only Place' }]);
    expect(reading.claims.map((claim) => claim.kind)).toEqual([
      'kept-orientation',
      'recent-kept-dialog',
    ]);
  });
});
