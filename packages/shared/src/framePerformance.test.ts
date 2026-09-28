import { describe, expect, it } from 'vitest';
import {
  applyDialogFrameAuthority,
  bindFramePerformanceCue,
  humanRequestsDialogFrame,
  parseFramePerformance,
  parseSelectedVoices,
  promotedDialogFrame,
  withPerformanceContext,
} from './framePerformance.js';

const voices = [
  { slug: 'ceox', line: 'You are asking for better editing.' },
];

const valid = {
  version: 1,
  title: 'One storyline. Not three.',
  context: { documentTitle: 'Finding the Plot', sectionTitle: 'Vision' },
  beats: [
    { title: 'One storyline. Not three.', body: 'The Lead keeps a single telling.' },
    {
      title: 'Let the voice enter',
      body: 'A line can sit inside the story.',
      voice: {
        slug: 'ceox',
        attributedTo: 'Ceox',
        text: 'better editing',
      },
    },
    { title: 'The through-line', body: 'Cast angles become one plot.' },
    { title: 'Dialog performs', body: 'The frame stays in the river.' },
  ],
  cue: {
    prompt: 'Ready to move this forward?',
    actions: [
      { kind: 'keep', label: 'Keep' },
      { kind: 'review_cast', label: 'Review' },
      { kind: 'open_stage', label: 'Take to Stage' },
    ],
  },
};

describe('parseFramePerformance', () => {
  it('accepts four beats, a section, and one selected voice', () => {
    const parsed = parseFramePerformance(valid, { selectedVoices: voices });
    expect(parsed?.title).toBe('One storyline. Not three.');
    expect(parsed?.beats).toHaveLength(4);
    expect(parsed?.context?.sectionTitle).toBe('Vision');
    expect(parsed?.beats[1]?.voice?.slug).toBe('ceox');
  });

  it('allows an unassigned section', () => {
    const parsed = parseFramePerformance({
      ...valid,
      context: { documentTitle: 'Finding the Plot', sectionTitle: null },
      beats: valid.beats.slice(0, 1),
    });
    expect(parsed?.context?.sectionTitle).toBeNull();
  });

  it('rejects a fifth beat, an unknown voice, markup, and a Document title used as the Point', () => {
    expect(parseFramePerformance({
      ...valid,
      beats: [...valid.beats, { title: 'Extra', body: 'No.' }],
    })).toBeNull();
    expect(parseFramePerformance({
      ...valid,
      beats: [{
        title: 'A beat',
        body: 'Body',
        voice: { slug: 'other', attributedTo: 'Other', text: 'invented' },
      }],
    }, { selectedVoices: voices })).toBeNull();
    expect(parseFramePerformance({
      title: 'A point',
      beats: [{ title: 'Beat', body: '<p>markup</p>' }],
    })).toBeNull();
    expect(parseFramePerformance({
      title: 'Finding the Plot',
      context: { documentTitle: 'Finding the Plot', sectionTitle: 'Vision' },
      beats: [{ title: 'Beat', body: 'Body' }],
    })).toBeNull();
  });
});

describe('bindFramePerformanceCue', () => {
  it('drops Keep when no Point exists and keeps Stage and Cast review', () => {
    const parsed = parseFramePerformance(valid, { selectedVoices: voices });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const bound = bindFramePerformanceCue(parsed, { hasCastVoices: true });
    expect(bound.cue?.actions.map((action) => action.kind)).toEqual(['review_cast', 'open_stage']);
  });

  it('stamps Point ids onto Keep and Open when the turn has a Point', () => {
    const parsed = parseFramePerformance({
      title: 'One storyline. Not three.',
      beats: [{ title: 'The telling', body: 'One plot.' }],
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const bound = bindFramePerformanceCue(parsed, {
      hasCastVoices: false,
      pointId: 'pt-1',
      draftId: 'dr-1',
      dialogId: 'dlg-1',
    });
    const keep = bound.cue?.actions.find((action) => action.kind === 'keep');
    expect(keep?.pointId).toBe('pt-1');
    expect(keep?.draftId).toBe('dr-1');
  });
});

describe('withPerformanceContext', () => {
  it('replaces Rendr context with the Document Keeper knows', () => {
    const parsed = parseFramePerformance({
      title: 'One storyline. Not three.',
      beats: [{ title: 'The telling', body: 'One plot.' }],
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const stamped = withPerformanceContext(parsed, {
      documentTitle: 'Finding the Plot',
      sectionTitle: null,
    });
    expect(stamped?.context?.documentTitle).toBe('Finding the Plot');
    expect(stamped?.context?.sectionTitle).toBeNull();
  });
});

describe('parseSelectedVoices', () => {
  it('keeps real lines and drops empty ones', () => {
    expect(parseSelectedVoices([
      { slug: 'Cloud', line: 'The Dialog is the plot.' },
      { slug: 'rendr', line: '   ' },
    ])).toEqual([{ slug: 'cloud', line: 'The Dialog is the plot.' }]);
  });
});

describe('applyDialogFrameAuthority', () => {
  it('drops Rendr promote unless the Lead or the human authorized a Frame', () => {
    const parsed = parseFramePerformance({
      ...valid,
      recommendPresentation: true,
      beats: [{ ...valid.beats[0], promote: true }],
    }, { selectedVoices: voices });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const held = applyDialogFrameAuthority(parsed, false);
    expect(held.beats[0]?.promote).toBeUndefined();
    expect(held.recommendPresentation).toBe(true);
    expect(promotedDialogFrame(held)).toBeNull();
    const presented = applyDialogFrameAuthority(parsed, true);
    expect(presented.beats.every((beat) => beat.promote === true)).toBe(true);
    expect(promotedDialogFrame(presented)?.beats).toHaveLength(1);
  });
});

describe('humanRequestsDialogFrame', () => {
  it('hears an explicit Frame ask and ignores framework talk', () => {
    expect(humanRequestsDialogFrame('Show this as a frame.')).toBe(true);
    expect(humanRequestsDialogFrame('Can we have a dialog frame for that beat?')).toBe(true);
    expect(humanRequestsDialogFrame('We need a framework for the cast.')).toBe(false);
    expect(humanRequestsDialogFrame('Tell me what you heard.')).toBe(false);
  });
});

describe('promotedDialogFrame', () => {
  it('stays empty until a beat is explicitly promoted', () => {
    const parsed = parseFramePerformance(valid, { selectedVoices: voices });
    expect(promotedDialogFrame(parsed)).toBeNull();
    expect(promotedDialogFrame(null)).toBeNull();
  });

  it('keeps only beats Keeper stamped for presentation', () => {
    const parsed = parseFramePerformance({
      ...valid,
      beats: [
        { ...valid.beats[0], promote: true },
        valid.beats[1],
        { title: 'Not this one', body: 'Still conversation.', promote: 'yes' },
      ],
    }, { selectedVoices: voices });
    const frame = promotedDialogFrame(parsed);
    expect(frame?.beats.map((beat) => beat.title)).toEqual(['One storyline. Not three.']);
    expect(frame?.beats[0]?.promote).toBe(true);
  });
});
