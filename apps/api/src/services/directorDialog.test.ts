import { describe, expect, it } from 'vitest';
import {
  buildCastConsultationsSynthesisPrompt,
  buildCastMemberDelegationPrompt,
} from './directorDialog.js';

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
    expect(prompt).not.toMatch(/REQUIRED when the user asked for lock/i);
  });
});
