import { describe, expect, it } from 'vitest';
import type { WhereWeAreReading } from './stageArrival.js';
import {
  buildStoryTruthPacket,
  humanRequestsKeeperStory,
  keeperStoryIdForTitle,
  meaningWithStorySources,
  selectStoryClaims,
} from './storyTruthPacket.js';

const reading: WhereWeAreReading = {
  places: [
    { dialogId: 'plot', title: 'Finding the Plot' },
    { dialogId: 'speak', title: 'Be.Speak.Become' },
  ],
  claims: [
    {
      kind: 'kept-orientation',
      dialogId: 'plot',
      title: 'Finding the Plot',
      provenance: {},
    },
    {
      kind: 'recent-kept-dialog',
      dialogId: 'speak',
      title: 'Be.Speak.Become',
      provenance: {},
    },
  ],
  trail: { stageBeatTitles: ['Dialog. Stage. Deploy.'], chatterTitles: [], history: [] },
};

describe('buildStoryTruthPacket', () => {
  it('states supported absences and where-we-are lines, and leaves the other filmstrip out', () => {
    const packet = buildStoryTruthPacket({
      domainId: 'ke3p',
      domainName: 'KE3P',
      wordmark: 'KE3P',
      tagline: 'A place',
      focus: {
        id: 'speak',
        title: 'Be.Speak.Become',
        documentStatus: 'kept',
        hasSessionTrail: true,
      },
      reading,
    });
    const texts = packet.claims.map((claim) => claim.text);
    expect(texts).toContain('KE3P. A place');
    expect(texts).toContain('Be.Speak.Become is kept.');
    expect(texts).toContain('Be.Speak.Become has no Orientation.');
    expect(texts).toContain('Be.Speak.Become has no Forward.');
    expect(texts).toContain('Be.Speak.Become has no Step.');
    expect(texts).toContain('Be.Speak.Become has a Chronicle session trail.');
    expect(texts).toContain('The trail does not currently resolve to one place.');
    expect(texts).toContain('Finding the Plot has the kept Orientation.');
    expect(texts).toContain('Be.Speak.Become is the most recently kept named Dialog.');
    expect(texts.join('\n')).not.toContain('Dialog. Stage. Deploy.');
  });
});

describe('selectStoryClaims', () => {
  it('keeps Kip’s order, drops unknown ids, and stops at four', () => {
    const packet = buildStoryTruthPacket({
      domainId: 'ke3p',
      domainName: 'KE3P',
      focus: {
        id: 'speak',
        title: 'Be.Speak.Become',
        documentStatus: 'kept',
        hasSessionTrail: false,
      },
      reading: { places: [], claims: [], trail: { stageBeatTitles: [], chatterTitles: [], history: [] } },
    });
    const ids = ['missing', 'dialog-step-absent', 'domain-cover', 'dialog-status', 'dialog-orientation-absent', 'dialog-forward-absent'];
    const selected = selectStoryClaims(packet, ids);
    expect(selected.claims.map((claim) => claim.id)).toEqual([
      'dialog-step-absent',
      'domain-cover',
      'dialog-status',
      'dialog-orientation-absent',
      'dialog-forward-absent',
    ]);
    expect(selected.trimmed).toBe(false);
  });
});

describe('meaningWithStorySources', () => {
  it('keeps the Lead telling and cites the Dialogs behind the claims', () => {
    const packet = buildStoryTruthPacket({
      domainId: 'ke3p',
      domainName: 'KE3P',
      focus: {
        id: 'speak',
        title: 'Be.Speak.Become',
        documentStatus: 'kept',
        hasSessionTrail: false,
      },
      reading: { places: [], claims: [], trail: { stageBeatTitles: [], chatterTitles: [], history: [] } },
    });
    const meaning = meaningWithStorySources(
      {
        meaning: 'This Dialog is kept, and it has not yet named where it is going.',
        about: [],
        performedBy: ['kip'],
      },
      packet.claims.filter((claim) => claim.id === 'dialog-status' || claim.id === 'dialog-forward-absent'),
      { dialogId: 'speak', dialogTitle: 'Be.Speak.Become' },
    );
    expect(meaning.meaning).toBe('This Dialog is kept, and it has not yet named where it is going.');
    expect(meaning.meaning).not.toContain('Be.Speak.Become is kept.');
    expect(meaning.presentFrame).toBe(true);
    expect(meaning.about).toEqual([{ kind: 'dialog', id: 'speak', title: 'Be.Speak.Become' }]);
  });
});

describe('story direction phrases', () => {
  it('hears the working title and gives that Story a stable id', () => {
    expect(humanRequestsKeeperStory('Create Already in Progress... from what you know.')).toBe(true);
    expect(humanRequestsKeeperStory('Where are we?')).toBe(false);
    expect(keeperStoryIdForTitle('Already in Progress...')).toBe('already-in-progress');
  });
});
