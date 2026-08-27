import { describe, expect, it } from 'vitest';
import {
  detectGlossIntent,
  shouldRunGlossFollowUp,
  buildGlossTurnCard,
} from '../services/kip/glossIntent.js';

describe('detectGlossIntent', () => {
  it('hears gloss on a Point', () => {
    expect(
      detectGlossIntent('Yes, and this follow up should like be a gloss to that point'),
    ).toBe('required');
    expect(detectGlossIntent('Hmmmm.. I dont see the GLoss.')).toBe('required');
  });

  it('hears Yes after the Lead offered a Gloss', () => {
    expect(
      detectGlossIntent(
        'Yes.',
        'Want me to add it as a Gloss to Point 14?',
      ),
    ).toBe('required');
    expect(detectGlossIntent('Yes.', 'Want me to add a Point?')).toBe('none');
    expect(
      detectGlossIntent(
        'Yes.',
        'Want me to add it as a Gloss to Point 14? I can also capture it as a Point.',
      ),
    ).toBe('required');
  });

  it('does not treat ordinary talk as Gloss', () => {
    expect(detectGlossIntent('What are we here for?')).toBe('none');
  });
});

describe('shouldRunGlossFollowUp', () => {
  it('asks again when the Lead narrated instead of gloss.append', () => {
    expect(
      shouldRunGlossFollowUp({
        intent: 'required',
        isTurnOwner: true,
        actionResults: [],
      }),
    ).toBe(true);
    expect(
      shouldRunGlossFollowUp({
        intent: 'required',
        isTurnOwner: true,
        actionResults: [{ type: 'gloss.append', status: 'success' }],
      }),
    ).toBe(false);
  });
});

describe('buildGlossTurnCard', () => {
  it('surfaces a card when Gloss lands', () => {
    const card = buildGlossTurnCard({
      dialogTitle: 'Objective. Go Public',
      results: [
        {
          type: 'gloss.append',
          status: 'success',
          data: { point: { prelude: 'A holding stage' }, preview: 'Shakespeare and Elvis' },
        },
      ],
    });
    expect(card?.type).toBe('summary');
    expect(card?.title).toContain('Gloss added');
  });
});
