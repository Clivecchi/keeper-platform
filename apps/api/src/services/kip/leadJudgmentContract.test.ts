import { describe, expect, it } from 'vitest';
import {
  buildLeadJudgmentContractPrompt,
  isLeadRole,
} from './leadJudgmentContract.js';

describe('leadJudgmentContract', () => {
  it('treats Lead as a role, not a named agent', () => {
    expect(isLeadRole('Lead')).toBe(true);
    expect(isLeadRole('lead')).toBe(true);
    expect(isLeadRole('System')).toBe(false);
    expect(isLeadRole('Coordinator')).toBe(false);
  });

  it('defines Lead Judgment without naming Kip or a specific scene', () => {
    const prompt = buildLeadJudgmentContractPrompt();
    expect(prompt).toMatch(/LEAD JUDGMENT — role contract/);
    expect(prompt).toMatch(/Find the plot/);
    expect(prompt).toMatch(/not a recap of Cast/);
    expect(prompt).toMatch(/no meaningful new conclusion/);
    expect(prompt).toMatch(/unresolved tension/);
    expect(prompt).toMatch(/human has already decided/);
    expect(prompt).not.toMatch(/Kip/i);
    expect(prompt).not.toMatch(/Composer/i);
    expect(prompt).not.toMatch(/1–3 short sentences/);
    expect(prompt).not.toMatch(/Synthesize for the user/i);
  });

  it('forbids a Summary card that recaps the room', () => {
    const prompt = buildLeadJudgmentContractPrompt();
    expect(prompt).toMatch(/Do not emit card type "summary" to recap a performance/);
    expect(prompt).toMatch(/You do not Echo/);
  });
});
