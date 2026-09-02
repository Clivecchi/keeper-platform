import { describe, expect, it } from 'vitest';
import { formatKeeperAdviceCardForPrompt } from '@keeper/shared';
import {
  buildCastConsultationsSynthesisPrompt,
  buildCastMemberDelegationPrompt,
  buildDirectorSynthesisPrompt,
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
  });
});

describe('buildCastConsultationsSynthesisPrompt', () => {
  it('asks Lead to talk, not file minutes, and to write promised Points', () => {
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
    expect(prompt).toMatch(/committee report/i);
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
});

describe('buildDirectorSynthesisPrompt', () => {
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
