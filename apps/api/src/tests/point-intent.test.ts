import { describe, expect, it } from 'vitest';
import {
  applyManuscriptDraftIdToProposePayload,
  buildPointContributionCard,
  buildPointObligationBlockedNotice,
  buildPointObligationFollowUpInput,
  buildPointObligationSystemPrompt,
  clampCastAdviceForPointTurn,
  detectPointIntent,
  preferShortPointTurnResponse,
  resolvePointTurnObligation,
  shouldRunPointObligationFollowUp,
} from '../services/kip/pointIntent.js';

describe('detectPointIntent', () => {
  it('recognizes explicit Point requests', () => {
    expect(detectPointIntent('propose a point').kind).toBe('required');
    expect(detectPointIntent('so propose a points').kind).toBe('required');
    expect(detectPointIntent('Add that as a Point.').kind).toBe('required');
    expect(detectPointIntent('capture these points').kind).toBe('required');
    expect(detectPointIntent('put that in the Document').kind).toBe('required');
    expect(detectPointIntent('make that a Point').kind).toBe('required');
    expect(detectPointIntent('Propose the points into the draft').kind).toBe('required');
    expect(
      detectPointIntent(
        'We have concluded that the model provides intelligence and Keeper provides Agency. Add that as a Point.',
      ).kind,
    ).toBe('required');
    expect(
      detectPointIntent('Capture the three major conclusions from this discussion as Points.').kind,
    ).toBe('required');
  });

  it('does not fire on ordinary-language point', () => {
    expect(detectPointIntent("what's the point of this?").kind).toBe('none');
    expect(detectPointIntent('point of view from Rendr').kind).toBe('none');
    expect(detectPointIntent('How should we think about Agency?').kind).toBe('none');
  });

  it('honors no-write constraints (Scenario E)', () => {
    expect(
      detectPointIntent("Let's discuss possible Points, but don't add anything yet.").kind,
    ).toBe('constrained');
    expect(detectPointIntent('discuss possible points without adding').kind).toBe('constrained');
  });
});

describe('resolvePointTurnObligation', () => {
  const manuscriptEnv = {
    dialogDocument: {
      dialogId: 'dlg-1',
      title: 'Re-Center',
      titleSource: 'user_set',
      manuscriptDraftId: 'ms-1',
    },
  };

  it('targets the active manuscript (Scenario A)', () => {
    expect(resolvePointTurnObligation('Add that as a Point.', manuscriptEnv)).toEqual({
      required: true,
      constrained: false,
      dialogId: 'dlg-1',
      dialogTitle: 'Re-Center',
      manuscriptDraftId: 'ms-1',
    });
  });

  it('blocks Chatter without creating a Draft (Scenario D)', () => {
    expect(
      resolvePointTurnObligation('Add that as a Point.', {
        dialogDocument: {
          dialogId: 'dlg-chatter',
          title: 'New session',
          titleSource: 'auto_generated',
        },
      }).blocker,
    ).toBe('chatter');
  });

  it('blocks missing manuscript honestly (Scenario D)', () => {
    expect(
      resolvePointTurnObligation('Add that as a Point.', {
        dialogDocument: {
          dialogId: 'dlg-1',
          title: 'Re-Center',
          titleSource: 'user_set',
        },
      }).blocker,
    ).toBe('no_manuscript');
  });

  it('does not require a write when constrained', () => {
    expect(
      resolvePointTurnObligation("Let's discuss possible Points, but don't add anything yet.", manuscriptEnv),
    ).toEqual({ required: false, constrained: true });
  });
});

describe('point obligation follow-up', () => {
  const obligation = {
    required: true,
    constrained: false,
    dialogId: 'dlg-1',
    dialogTitle: 'Re-Center',
    manuscriptDraftId: 'ms-1',
  };

  it('runs when Lead omitted the Point write', () => {
    expect(
      shouldRunPointObligationFollowUp({
        obligation,
        actionResults: [],
        isLead: true,
      }),
    ).toBe(true);
  });

  it('skips when propose already succeeded', () => {
    expect(
      shouldRunPointObligationFollowUp({
        obligation,
        actionResults: [{ type: 'draft.update.propose', status: 'success' }],
        isLead: true,
      }),
    ).toBe(false);
  });

  it('does not force Cast to write', () => {
    expect(
      shouldRunPointObligationFollowUp({
        obligation,
        actionResults: [],
        isLead: false,
      }),
    ).toBe(false);
  });

  it('names the manuscript id in follow-up input', () => {
    const input = buildPointObligationFollowUpInput({
      originalInput: 'Add that as a Point.',
      agentName: 'Kip',
      priorResponseText: 'Points still need manual intervention.',
      obligation,
    });
    expect(input).toContain('ms-1');
    expect(input).toContain('draft.update.propose');
    expect(input).toContain('Do not draft.create');
  });
});

describe('point prompts', () => {
  it('grounds Cast that Point is a Keeper object (Scenario C)', () => {
    const prompt = buildPointObligationSystemPrompt(
      {
        required: true,
        constrained: false,
        dialogId: 'dlg-1',
        dialogTitle: 'Re-Center',
        manuscriptDraftId: 'ms-1',
      },
      'cast',
    );
    expect(prompt).toContain('not layout');
    expect(prompt).toContain('spec_json.points');
    expect(prompt).toContain('ms-1');
    expect(prompt).toContain('two sentences maximum');
    expect(prompt).not.toMatch(/TURN OBLIGATION/);
  });

  it('tells Lead the write is required', () => {
    const prompt = buildPointObligationSystemPrompt(
      {
        required: true,
        constrained: false,
        dialogId: 'dlg-1',
        dialogTitle: 'Becoming Together',
        manuscriptDraftId: 'ms-1',
      },
      'lead',
    );
    expect(prompt).toContain('TURN OBLIGATION');
    expect(prompt).toContain('ms-1');
    expect(prompt).toContain('1–3 short sentences');
  });

  it('surfaces Chatter blockers honestly', () => {
    expect(
      buildPointObligationBlockedNotice({
        required: true,
        constrained: false,
        blocker: 'chatter',
      }),
    ).toMatch(/Chatter/);
  });
});

describe('applyManuscriptDraftIdToProposePayload', () => {
  it('fills omitted draft id from the active manuscript', () => {
    expect(applyManuscriptDraftIdToProposePayload({ content: 'Agency' }, 'ms-1')).toEqual({
      content: 'Agency',
      id: 'ms-1',
      draftId: 'ms-1',
    });
  });

  it('does not override an explicit draft id', () => {
    expect(
      applyManuscriptDraftIdToProposePayload({ id: 'other', content: 'Agency' }, 'ms-1'),
    ).toEqual({ id: 'other', content: 'Agency' });
  });
});

describe('Point UI over essays', () => {
  it('builds a summary card from successful Point writes', () => {
    const card = buildPointContributionCard({
      dialogTitle: 'Finding the plot',
      results: [
        {
          type: 'draft.update.propose',
          status: 'success',
          data: { point: { prelude: 'Agency over habit', content: 'Keeper owns the write.' } },
        },
        {
          type: 'draft.update.propose',
          status: 'success',
          data: { point: { content: 'Cast advises; Lead writes.' } },
        },
      ],
    });
    expect(card?.title).toBe('Added 2 Points · Finding the plot');
    expect(card?.items).toEqual(['Agency over habit', 'Cast advises; Lead writes.']);
  });

  it('replaces Cast roll-call novels after Points land', () => {
    expect(
      preferShortPointTurnResponse({
        responseText: '### Cloud\nA long implementation essay.\n\n### Rendr\nA layout essay.',
        pointCount: 2,
        dialogTitle: 'Finding the plot',
      }),
    ).toBe('Added 2 Points to Finding the plot.');
  });

  it('clamps Cast Point-turn advice', () => {
    const long = `${'Word. '.repeat(80)}More after that.`;
    const clamped = clampCastAdviceForPointTurn(long);
    expect(clamped.length).toBeLessThan(long.length);
    expect(clamped.length).toBeLessThanOrEqual(360);
  });
});
