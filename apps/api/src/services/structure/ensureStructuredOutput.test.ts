import { describe, expect, it } from 'vitest';
import {
  looksLikeJsonAttempt,
  parseKipAgentOutput,
  visibleAgentMessageText,
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

  it('parses optional structured card field', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'Saved.',
      card: {
        type: 'status',
        title: 'Draft created',
        body: 'Your draft is ready.',
        meta: 'draft-1',
      },
      actions: [],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.responseText).toBe('Saved.');
    expect(result.card).toEqual({
      type: 'status',
      title: 'Draft created',
      body: 'Your draft is ready.',
      meta: 'draft-1',
    });
  });

  it('ignores invalid card without type/title', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'Ok',
      card: { body: 'missing required fields' },
      actions: [],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.card).toBeUndefined();
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

  it('parses keepingChoices without treating them as actions', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'I see two keep-worthy meanings.',
      keepingChoices: [
        {
          label: 'Keep this consequence',
          direction: 'Preserve this architectural consequence if it still holds.',
          meaning: 'Stage must not force mutation.',
        },
        {
          label: 'Develop Local Stores',
          direction: 'Develop Local Stores as a Story if that still fits.',
          about: 'Local Stores',
        },
      ],
      actions: [],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.actions).toEqual([]);
    expect(result.keepingChoices).toHaveLength(2);
    expect(result.keepingChoices?.[0]?.label).toBe('Keep this consequence');
    expect(result.keepingChoices?.[1]?.label).toBe('Develop Local Stores');
  });

  it('keeps directed Point acts on draft.update.propose rather than converting them', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'I can add that as a Point.',
      actions: [
        {
          type: 'draft.update.propose',
          payload: {
            title: 'Local Stores consequence',
            content: 'Stage must not force mutation.',
          },
        },
      ],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.keepingChoices).toBeUndefined();
    expect(result.actions).toEqual([
      {
        type: 'draft.update.propose',
        payload: {
          title: 'Local Stores consequence',
          content: 'Stage must not force mutation.',
        },
      },
    ]);
  });

  it('lets directed propose and undirected keepingChoices coexist without executing offers', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'I will add the Point. I also see another meaning.',
      actions: [
        {
          type: 'draft.update.propose',
          payload: { title: 'Add this Point', content: 'Directed keep.' },
        },
      ],
      keepingChoices: [
        {
          label: 'Develop Local Stores',
          direction: 'Develop Local Stores as a Story if that still fits.',
        },
      ],
    });
    const result = parseKipAgentOutput(raw);
    expect(result.actions.map((action) => action.type)).toEqual(['draft.update.propose']);
    expect(result.keepingChoices).toHaveLength(1);
    expect(result.keepingChoices?.[0]?.label).toBe('Develop Local Stores');
  });

  it('unwraps agent_output JSON for session history', () => {
    const raw = JSON.stringify({
      type: 'agent_output',
      response: 'The Forward is public presentation of the work.',
      actions: [],
    });
    expect(visibleAgentMessageText(raw)).toBe('The Forward is public presentation of the work.');
    expect(visibleAgentMessageText('Plain Lead reply.')).toBe('Plain Lead reply.');
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
