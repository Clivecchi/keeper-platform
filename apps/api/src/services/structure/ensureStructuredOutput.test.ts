import { describe, expect, it } from 'vitest';
import {
  looksLikeJsonAttempt,
  parseKipAgentOutput,
  wrapProseAsAgentOutput,
} from './parseKipAgentOutput.js';
import { ensureStructuredOutput } from './ensureStructuredOutput.js';
import { KIP_AGENT_OUTPUT_CONTRACT_ID } from '@keeper/shared';

describe('parseKipAgentOutput', () => {
  it('parses valid agent_output envelope', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'Hello there.',
      actions: [],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.responseText).toBe('Hello there.');
    expect(result.actions).toEqual([]);
    expect(result.ignoredReason).toBeUndefined();
  });

  it('wraps plain prose via wrapProseAsAgentOutput', () => {
    const result = wrapProseAsAgentOutput('We build Keeper using Keeper.');
    expect(result.responseText).toBe('We build Keeper using Keeper.');
    expect(result.actions).toEqual([]);
    expect(result.ignoredReason).toBe('plain_text_fallback');
  });

  it('detects json attempts vs prose', () => {
    expect(looksLikeJsonAttempt('{"type":')).toBe(true);
    expect(looksLikeJsonAttempt('Here is my answer.')).toBe(false);
  });

  it('marks broken json as invalid_json', () => {
    const result = parseKipAgentOutput('{not json');
    expect(result.ignoredReason).toBe('invalid_json');
  });
});

describe('ensureStructuredOutput kip.agent_output', () => {
  it('returns prose fallback without Together when output is plain text', async () => {
    const result = await ensureStructuredOutput({
      contractId: KIP_AGENT_OUTPUT_CONTRACT_ID,
      raw: 'How we build Keeper using Keeper — start with drafts.',
    });
    expect(result.responseText).toContain('How we build Keeper');
    expect(result.ignoredReason).toBe('plain_text_fallback');
    expect(result.actions).toEqual([]);
  });
});
