import { describe, expect, it } from 'vitest';
import {
  applyManuscriptDraftIdToProposePayload,
  applyPointTurnDialogCopy,
  buildPointContributionCard,
  buildPointTurnFailureCard,
  buildPointObligationBlockedNotice,
  buildPointObligationFollowUpInput,
  buildPointObligationSystemPrompt,
  clampCastAdviceForPointTurn,
  detectCastPromisedPointWrite,
  detectNamedSectionTitle,
  detectPointIntent,
  detectPointRewriteIntent,
  humanTurnTextForIntent,
  preferShortPointTurnResponse,
  resolvePointTurnActor,
  resolvePointTurnObligation,
  shouldRunPointAskFollowUp,
  shouldRunPointObligationFollowUp,
  stripLeadCastRollCall,
  agentOfferedPointInProse,
} from '../services/kip/pointIntent.js';
import { buildKeeperCardRenderingPrompt } from '../services/kip/buildKeeperCardRenderingPrompt.js';

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
    expect(detectPointIntent("hmmmm... doesnt look like you were able to propose the points.").kind).toBe(
      'required',
    );
    expect(detectPointIntent('And still nothing').kind).toBe('required');
    expect(detectPointIntent('And again, same behavior').kind).toBe('required');
    expect(detectPointIntent('What document or draft did you propose them to?').kind).toBe('required');
    expect(
      detectPointIntent(
        'that is most certainly a point worth capturing. Because while I currently feel like the stage is inevitable',
      ).kind,
    ).toBe('required');
    expect(detectPointIntent("I love what Rendr said — that's a point worth capturing").kind).toBe(
      'required',
    );
    expect(
      detectPointIntent(
        'continue with Touchdown! and let\'s create a new section and call it, "Domain Stage"',
      ).kind,
    ).toBe('required');
    expect(detectPointIntent("I dont see the new section.")).toEqual({ kind: 'required' });
    expect(detectPointIntent('you skipped two actions. Okay, but why twice and why generic?').kind).toBe(
      'required',
    );
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
    expect(detectPointIntent("don't add Points yet").kind).toBe('constrained');
  });

  it('does not treat Document status language as a human constraint', () => {
    expect(detectPointIntent('The Document has no Points yet — meaning we are at the beginning.').kind).toBe('none');
    expect(detectPointIntent('Tell me the purpose of this dialog.').kind).toBe('none');
  });

  it('uses the visible prompt, not pasted supporting context', () => {
    expect(
      humanTurnTextForIntent(
        'see attached\n\n---\nSupporting context:\n\nThe Document has no Points yet',
        'see attached',
      ),
    ).toBe('see attached');
  });
});

describe('detectPointRewriteIntent', () => {
  it('hears rename / retitle as rewrite, not a new Point', () => {
    expect(
      detectPointRewriteIntent('So.. looks like you were nott able to rename the point previkosuly. So let\'s try again'),
    ).toBe('required');
    expect(detectPointRewriteIntent('retitle every point')).toBe('required');
    expect(detectPointIntent('rename the point').kind).toBe('none');
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
      writeKind: 'document',
      workingOnTitle: 'Re-Center',
    });
  });

  it('writes to the focused Draft, not the Dialog manuscript', () => {
    expect(
      resolvePointTurnObligation('Add that as a Point.', {
        ...manuscriptEnv,
        activeDraft: { id: 'draft-insights', title: 'Keeper UI Insights' },
      }),
    ).toEqual({
      required: true,
      constrained: false,
      dialogId: 'dlg-1',
      dialogTitle: 'Re-Center',
      manuscriptDraftId: 'draft-insights',
      writeKind: 'draft',
      workingOnTitle: 'Keeper UI Insights',
    });
  });

  it('writes to a Session-born Draft without inventing a Document', () => {
    expect(
      resolvePointTurnObligation('Add that as a Point.', {
        dialogDocument: {
          dialogId: 'dlg-chatter',
          title: 'Domain · conversation · Aug 21',
          titleSource: 'auto_generated',
        },
        activeDraft: { id: 'draft-session', title: 'New draft' },
      }),
    ).toEqual({
      required: true,
      constrained: false,
      dialogId: 'dlg-chatter',
      dialogTitle: 'Domain · conversation · Aug 21',
      manuscriptDraftId: 'draft-session',
      writeKind: 'draft',
      workingOnTitle: 'New draft',
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

describe('resolvePointTurnActor', () => {
  it('treats the addressed composer as the turn owner', () => {
    expect(resolvePointTurnActor({ input: 'Propose those Points.' })).toBe('lead');
    expect(resolvePointTurnActor({ input: 'Propose those Points.', supportEcho: true })).toBe('cast');
  });

  it('keeps nested consults and Echo advise-only', () => {
    expect(
      resolvePointTurnActor({
        input: '[Director delegation — Rendr on the Design board]\nThe user asked: "propose points"',
      }),
    ).toBe('cast');
    expect(
      resolvePointTurnActor({
        input: '[Platform collaboration — Kip]\nThe user asked: "propose points"',
      }),
    ).toBe('cast');
    expect(
      resolvePointTurnActor({
        input: '[Director synthesis — Rendr]\nCast replies above. Propose the Points.',
      }),
    ).toBe('lead');
    expect(
      resolvePointTurnActor({
        input: '[Agent Echo — Kip]\nHelp Rendr.',
      }),
    ).toBe('cast');
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
        isTurnOwner: true,
      }),
    ).toBe(true);
  });

  it('skips when propose already succeeded', () => {
    expect(
      shouldRunPointObligationFollowUp({
        obligation,
        actionResults: [{ type: 'draft.update.propose', status: 'success' }],
        isTurnOwner: true,
      }),
    ).toBe(false);
  });

  it('does not force nested Cast or Echo to write', () => {
    expect(
      shouldRunPointObligationFollowUp({
        obligation,
        actionResults: [],
        isTurnOwner: false,
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
    expect(prompt).toContain('do not invent payload.id');
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
    expect(prompt).toContain('payload.content');
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
  const manuscriptId = '3861059e-09b0-453d-9bdd-16ad8c02bb12';
  const otherDraftId = '3f638fba-d84d-453f-9add-e6e288e0db03';

  it('fills omitted draft id from the active manuscript', () => {
    expect(applyManuscriptDraftIdToProposePayload({ content: 'Agency' }, manuscriptId)).toEqual({
      content: 'Agency',
      id: manuscriptId,
      draftId: manuscriptId,
    });
  });

  it('replaces placeholder and manuscript-key ids', () => {
    expect(
      applyManuscriptDraftIdToProposePayload(
        { id: 'none', content: 'Agency' },
        manuscriptId,
      ),
    ).toEqual({ id: manuscriptId, draftId: manuscriptId, content: 'Agency' });
    expect(
      applyManuscriptDraftIdToProposePayload(
        { id: 'manuscript-finding-the-plot-abc123', content: 'Agency' },
        manuscriptId,
      ),
    ).toEqual({ id: manuscriptId, draftId: manuscriptId, content: 'Agency' });
  });

  it('does not override an explicit draft UUID', () => {
    expect(
      applyManuscriptDraftIdToProposePayload(
        { id: otherDraftId, content: 'Agency' },
        manuscriptId,
      ),
    ).toEqual({ id: otherDraftId, draftId: otherDraftId, content: 'Agency' });
  });

  it('Point obligation forces the Dialog manuscript UUID', () => {
    expect(
      applyManuscriptDraftIdToProposePayload(
        { id: otherDraftId, content: 'Agency' },
        manuscriptId,
        { forceManuscript: true },
      ),
    ).toEqual({ id: manuscriptId, draftId: manuscriptId, content: 'Agency' });
  });

  it('does not send a non-UUID manuscript id to Prisma', () => {
    expect(
      applyManuscriptDraftIdToProposePayload({ content: 'Agency' }, 'manuscript-finding-the-plot'),
    ).toEqual({ content: 'Agency' });
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

  it('builds a Point card when the write fails', () => {
    const card = buildPointTurnFailureCard({
      dialogTitle: 'Finding the plot',
      results: [
        {
          type: 'draft.update.propose',
          status: 'error',
          message: 'invalid prisma.kip_drafts.findFirst() invocation',
          data: { content: 'The model supplies intelligence.' },
        },
      ],
    });
    expect(card?.type).toBe('error');
    expect(card?.title).toBe('Points were not added · Finding the plot');
    expect(card?.items).toEqual(['The model supplies intelligence.']);
  });

  it('does not leave Prisma in the Dialog copy', () => {
    expect(
      applyPointTurnDialogCopy({
        responseText:
          'Let us propose some Points. I attempted draft work, but it did not complete: invalid prisma.kip_drafts.findFirst()',
        results: [{ type: 'draft.update.propose', status: 'error' }],
        dialogTitle: 'Finding the plot',
        obligationRequired: true,
      }),
    ).toBe('Let us propose some Points.');
    expect(
      applyPointTurnDialogCopy({
        responseText: 'invalid prisma.kip_drafts.findFirst() invocation',
        results: [{ type: 'draft.update.propose', status: 'error' }],
        dialogTitle: 'Finding the plot',
        obligationRequired: true,
      }),
    ).toBe('I could not add Points to Finding the plot.');
  });

  it('clamps Cast Point-turn advice', () => {
    const long = `${'Word. '.repeat(80)}More after that.`;
    const clamped = clampCastAdviceForPointTurn(long);
    expect(clamped.length).toBeLessThan(long.length);
    expect(clamped.length).toBeLessThanOrEqual(360);
  });
});

describe('detectCastPromisedPointWrite', () => {
  it('hears Cast claiming they will write a Point', () => {
    expect(
      detectCastPromisedPointWrite([
        "Rendr's line is a Point. I'll capture it now under the 'Keeper Stage' section.",
      ]),
    ).toBe(true);
    expect(
      detectCastPromisedPointWrite([
        "I'm creating the 'Domain Stage' section now to capture what that milestone means.",
      ]),
    ).toBe(true);
    expect(
      detectCastPromisedPointWrite([
        'I\'ll create a new Section called "Domain Stage" in the Touchdown! manuscript.',
      ]),
    ).toBe(true);
    expect(detectCastPromisedPointWrite(['The stage should feel inevitable.'])).toBe(false);
  });
});

describe('detectNamedSectionTitle', () => {
  it('reads a quoted Section name', () => {
    expect(
      detectNamedSectionTitle(
        'let\'s create a new section and call it, "Domain Stage" - That is, when we reach this point',
      ),
    ).toBe('Domain Stage');
  });
});

describe('stripLeadCastRollCall', () => {
  it('drops ### Cloud / ### Rendr and committee minutes', () => {
    const stripped = stripLeadCastRollCall(
      [
        '### Cloud',
        "I'll capture it now.",
        '',
        '### Rendr',
        'The stage has to feel inevitable.',
        '',
        'Cloud and Rendr both agree that the phrase should be captured as a new Point.',
      ].join('\n'),
    );
    expect(stripped).not.toMatch(/^### /m);
    expect(stripped.length).toBeLessThan(200);
  });
});

describe('agentOfferedPointInProse', () => {
  it('catches permission asks and soft offers', () => {
    expect(agentOfferedPointInProse('Want me to add that as a Point — and flag it as a capability gap?')).toBe(true);
    expect(agentOfferedPointInProse('I can add this as a Point if you would like.')).toBe(true);
    expect(agentOfferedPointInProse('Would you like me to capture this on the Document?')).toBe(true);
    expect(agentOfferedPointInProse('Shall I propose this?')).toBe(true);
    expect(agentOfferedPointInProse('Let me know if you want this as a Point.')).toBe(true);
    expect(agentOfferedPointInProse('Here is a Point we should capture.')).toBe(true);
    expect(agentOfferedPointInProse('Proposed Point: Agency is the product.')).toBe(true);
  });

  it('leaves relational talk and Gloss offers alone', () => {
    expect(agentOfferedPointInProse('Would you like me to explain how Documents work?')).toBe(false);
    expect(agentOfferedPointInProse("That's a good point.")).toBe(false);
    expect(agentOfferedPointInProse("What's the point of that?")).toBe(false);
    expect(agentOfferedPointInProse('I can help think through this.')).toBe(false);
    expect(agentOfferedPointInProse('Shall I look that up?')).toBe(false);
    expect(agentOfferedPointInProse('Want me to add it as a Gloss to Point 14?')).toBe(false);
    expect(agentOfferedPointInProse('I can add a point of view in the next pass.')).toBe(false);
  });
});

describe('shouldRunPointAskFollowUp', () => {
  it('runs when the Lead offered a Point in prose', () => {
    expect(
      shouldRunPointAskFollowUp({
        isTurnOwner: true,
        actionResults: [],
        responseText: 'Want me to add that as a Point — and flag it as a capability gap?',
        manuscriptDraftId: 'draft-1',
      }),
    ).toBe(true);
    expect(
      shouldRunPointAskFollowUp({
        isTurnOwner: true,
        actionResults: [],
        responseText: 'I can add this as a Point if you would like.',
        manuscriptDraftId: 'draft-1',
      }),
    ).toBe(true);
  });

  it('does not run when they already proposed, or when they offered Gloss', () => {
    expect(
      shouldRunPointAskFollowUp({
        isTurnOwner: true,
        actionResults: [{ type: 'draft.update.propose', status: 'success' }],
        responseText: 'Want me to add that as a Point?',
        manuscriptDraftId: 'draft-1',
      }),
    ).toBe(false);
    expect(
      shouldRunPointAskFollowUp({
        isTurnOwner: true,
        actionResults: [],
        responseText: 'Want me to add it as a Gloss to Point 14?',
        manuscriptDraftId: 'draft-1',
      }),
    ).toBe(false);
  });
});

describe('buildKeeperCardRenderingPrompt', () => {
  it('names the story-builder contract once', () => {
    const prompt = buildKeeperCardRenderingPrompt();
    expect(prompt).toContain('STORY-BUILDER TURN');
    expect(prompt).toContain('Asking permission in prose is an incomplete turn');
    expect(prompt.indexOf('STORY-BUILDER TURN')).toBeLessThan(prompt.indexOf('RESPONSE RENDERING'));
  });
});
