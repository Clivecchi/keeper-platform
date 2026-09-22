import { describe, expect, it } from 'vitest';
import { formatKeeperAdviceCardForPrompt } from '@keeper/shared';
import {
  attachStageContextToCastEnvironment,
  buildCastConsultationsSynthesisPrompt,
  buildCastMemberDelegationPrompt,
  buildDirectorSynthesisPrompt,
  delegateConsultSkipMessage,
  stageContextForDelegatedCast,
} from './directorDialog.js';

const keepingJudgmentCard = {
  type: 'summary',
  title: 'Keeping Judgment Contract — Architectural Report',
  body: 'Form before capability.',
  items: ['**A. Keeping Judgment**\n\nJudge fitness before mutation.'],
};

describe('buildCastMemberDelegationPrompt', () => {
  it('tells Cast they cannot write the Document', () => {
    const prompt = buildCastMemberDelegationPrompt({
      userMessage: 'Capture Rendr’s line as a Point.',
      castMemberLabel: 'Cloud',
      directorName: 'Kip',
    });
    expect(prompt).toMatch(/cannot write the Document/i);
    expect(prompt).toMatch(/I['’]ll capture it now/i);
    expect(prompt).toMatch(/Do not write one undifferentiated paragraph/i);
    expect(prompt).not.toMatch(/one short paragraph/i);
    expect(prompt).toMatch(/Do not defer to Kip/i);
    expect(prompt).toMatch(/Never say a search or evaluation did not run/i);
  });
});

describe('buildCastConsultationsSynthesisPrompt', () => {
  it('asks Lead to stay in the performance and to write promised Points', () => {
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'that is most certainly a point worth capturing',
      directorName: 'Kip',
      consultations: [
        {
          label: 'Cloud',
          reply: "I'll capture it now under Keeper Stage.",
          status: 'ok',
        },
      ],
      castPromisedPointWrite: true,
    });
    expect(prompt).toMatch(/Orchestration context/i);
    expect(prompt).toMatch(/does not impersonate the human/i);
    expect(prompt).toMatch(/Find the plot/i);
    expect(prompt).toMatch(/committee report/i);
    expect(prompt).not.toMatch(/1–3 short sentences/i);
    expect(prompt).not.toMatch(/Synthesize for the user/i);
    expect(prompt).toMatch(/draft\.update\.propose/);
    expect(prompt).toMatch(/cannot write the Document/i);
    expect(prompt).toMatch(/Never document\.reorganize\.propose/);
    expect(prompt).not.toMatch(/REQUIRED when the user asked for lock/i);
  });

  it('tells Lead to direct the Document instead of reporting Cast', () => {
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'review the current document and suggest directorial changes',
      directorName: 'Kip',
      consultations: [
        { label: 'Cloud', reply: 'It is a spec archive.', status: 'ok' },
        { label: 'Rendr', reply: 'Reorder the sections.', status: 'ok' },
      ],
      documentDirection: true,
    });
    expect(prompt).toMatch(/YOU are the Director of this Document/i);
    expect(prompt).toMatch(/document\.reorganize\.propose/);
    expect(prompt).not.toMatch(/Never document\.reorganize\.propose/);
  });

  it('grounds synthesis in the delivered advisory card (Cast Stage advisory)', () => {
    const delivered = formatKeeperAdviceCardForPrompt(keepingJudgmentCard);
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'Cloud, read attached and respond accordingly',
      directorName: 'Kip',
      consultations: [
        {
          label: 'Cloud',
          reply: 'Let me give you the architectural report.',
          status: 'ok',
          deliveredAdvice: delivered,
        },
      ],
    });
    expect(prompt).toContain('Keeping Judgment Contract — Architectural Report');
    expect(prompt).toContain('Judge fitness before mutation');
    expect(prompt).toMatch(/Do NOT claim a cast member provided a report/);
    expect(prompt).not.toMatch(/Emit stage\.story\.layout this turn/);
  });

  it('asks for resolvedMeaning on a Stage performance without rewriting response', () => {
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'What emerged just now?',
      directorName: 'Kip',
      consultations: [
        { label: 'Cloud', reply: 'The Dialog is the plot.', status: 'ok' },
        { label: 'Rendr', reply: 'Hold that as one beat.', status: 'ok' },
      ],
      resolvePerformanceMeaning: true,
    });
    expect(prompt).toContain('resolvedMeaning');
    expect(prompt).toMatch(/must not be a restatement of "response"/i);
    expect(prompt).toMatch(/Do not emit stage\.story\.layout for this/);
    expect(prompt).not.toMatch(/Emit stage\.story\.layout this turn/);
  });

  it('does not let Lead claim an undelivered Cast report', () => {
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'Cloud, read attached and respond accordingly',
      directorName: 'Kip',
      consultations: [
        {
          label: 'Cloud',
          reply: 'Let me give you the architectural report.',
          status: 'ok',
        },
      ],
    });
    expect(prompt).toContain('No advisory card crossed to the human');
    expect(prompt).not.toContain('Keeping Judgment Contract — Architectural Report');
    expect(prompt).toMatch(/Do NOT treat "I will give you the report" as delivery/);
  });

  it('grounds Lead in action receipts so failed tools are not reported as findings', () => {
    const prompt = buildCastConsultationsSynthesisPrompt({
      userMessage: 'Cloud, probe GET /api/journeys',
      directorName: 'Kip',
      consultations: [
        {
          label: 'Cloud',
          reply: 'TypeSafe Probe initiated; high-confidence routes identified.',
          status: 'ok',
        },
      ],
      actionReceipts: [
        {
          type: 'typesafe.evaluate',
          status: 'error',
          errorCode: 'INVALID_QUESTIONS',
          message: 'typesafe.evaluate needs questions (map) or a single question string',
          data: { attributedTo: 'Cloud' },
        },
      ],
    });
    expect(prompt).toContain('Cloud · typesafe.evaluate: error (INVALID_QUESTIONS)');
    expect(prompt).toMatch(/Do not represent an action as initiated/);
    expect(prompt).toMatch(/An error receipt means that action failed/);
  });
});

describe('buildDirectorSynthesisPrompt', () => {
  it('keeps Cast results as context, not a synthesis-as-user brief', () => {
    const prompt = buildDirectorSynthesisPrompt({
      userMessage: 'Cloud, analyze this architecture',
      castMemberLabel: 'Cloud',
      castMemberReply: 'The contract is Form before capability.',
      directorName: 'Kip',
    });
    expect(prompt).toMatch(/Orchestration context/i);
    expect(prompt).toMatch(/does not impersonate the human/i);
    expect(prompt).toMatch(/Find the plot/i);
    expect(prompt).not.toMatch(/1–3 short sentences/i);
    expect(prompt).not.toMatch(/Stay brief when Cloud already answered/i);
  });

  it('treats card-only Cast advice as delivered and forbids false completion', () => {
    const prompt = buildDirectorSynthesisPrompt({
      userMessage: 'Cloud, analyze this architecture',
      castMemberLabel: 'Cloud',
      castMemberReply: '',
      directorName: 'Kip',
      deliveredAdvice: formatKeeperAdviceCardForPrompt(keepingJudgmentCard),
    });
    expect(prompt).toContain('Keeping Judgment Contract — Architectural Report');
    expect(prompt).toMatch(/Do NOT claim Cloud provided a report/);
  });

  it('forbids claiming a report when only an intro crossed', () => {
    const prompt = buildDirectorSynthesisPrompt({
      userMessage: 'Cloud, analyze this architecture',
      castMemberLabel: 'Cloud',
      castMemberReply: 'Let me give you the architectural report.',
      directorName: 'Kip',
    });
    expect(prompt).toContain('no separate advisory card crossed to the human');
    expect(prompt).toMatch(/Do NOT treat "I will give you the report" as delivery/);
  });
});

describe('Mechanism B Stage context + skip receipts', () => {
  it('copies Stage surface onto delegated Cast without skipDelegateConsult', () => {
    const stage = stageContextForDelegatedCast({
      workspaceSurface: 'stage',
      boardId: 'domain',
      dialogCueing: 'directed',
      conversationProfile: 'conversation',
      skipDelegateConsult: true,
      keepingChoice: { choiceId: 'x' },
    });
    expect(stage).toEqual({
      workspaceSurface: 'stage',
      boardId: 'domain',
      dialogCueing: 'directed',
      conversationProfile: 'conversation',
    });
    expect(stage).not.toHaveProperty('skipDelegateConsult');
  });

  it('leaves dialog-only Lead context empty for Cast Stage injection', () => {
    expect(stageContextForDelegatedCast({ boardId: 'domain' })).toEqual({ boardId: 'domain' });
    expect(stageContextForDelegatedCast({ skipDelegateConsult: true })).toBeUndefined();
  });

  it('merges Stage context onto a Cast environment', () => {
    const attached = attachStageContextToCastEnvironment(
      { agentContext: { audience: 'member' } },
      { workspaceSurface: 'stage', boardId: 'domain' },
    );
    expect(attached?.agentContext).toEqual({
      audience: 'member',
      workspaceSurface: 'stage',
      boardId: 'domain',
    });
  });

  it('uses nested-cast copy only for actual nested skips', () => {
    expect(delegateConsultSkipMessage(false)).toMatch(/nested cast run/);
    expect(delegateConsultSkipMessage(true)).toMatch(/Composer Cast chips already consulted/);
    expect(delegateConsultSkipMessage(true)).not.toMatch(/nested cast run/);
  });
});
