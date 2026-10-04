import { describe, expect, it } from 'vitest';
import { convertToAnthropicFormat, type ModelMessage } from './ModelProviderService.js';

const COMPLETED_TURN_CLOSE =
  'The previous assistant message is a completed turn. Write the next reply from the instructions already in this request.';

describe('convertToAnthropicFormat', () => {
  it('keeps a transcript that already ends on the human turn', () => {
    const messages: ModelMessage[] = [
      { role: 'system', content: 'You are Ceox.' },
      { role: 'user', content: 'Where are we?' },
      { role: 'assistant', content: 'We are in the Dialog.' },
      { role: 'user', content: 'Say it again.' },
    ];

    const { anthropicMessages, systemPrompt } = convertToAnthropicFormat(messages);

    expect(systemPrompt).toBe('You are Ceox.');
    expect(anthropicMessages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(anthropicMessages[2]?.content).toBe('Say it again.');
  });

  it('does not send a completed assistant turn as a Sonnet 4.6 prefill', () => {
    // Read follow-up shape: prior prompt, then the assistant completion,
    // then the next instruction as system text and no new user string.
    const messages: ModelMessage[] = [
      { role: 'system', content: 'Standing instructions.' },
      { role: 'user', content: 'Read the Document.' },
      { role: 'assistant', content: '{"type":"agent_output","response":"One moment."}' },
      { role: 'system', content: 'Use the read results. This is not the user message.' },
    ];

    const { anthropicMessages, systemPrompt } = convertToAnthropicFormat(messages);

    expect(systemPrompt).toContain('Standing instructions.');
    expect(systemPrompt).toContain('Use the read results.');
    expect(anthropicMessages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(anthropicMessages[1]?.content).toBe('{"type":"agent_output","response":"One moment."}');
    expect(anthropicMessages[2]?.content).toBe(COMPLETED_TURN_CLOSE);
  });

  it('merges adjacent assistant turns before closing the request', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: 'Go on.' },
      { role: 'assistant', content: 'First completion.' },
      { role: 'assistant', content: 'Second completion.' },
    ];

    const { anthropicMessages } = convertToAnthropicFormat(messages);

    expect(anthropicMessages.map((message) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(anthropicMessages[1]?.content).toBe('First completion.\n\nSecond completion.');
    expect(anthropicMessages[2]?.content).toBe(COMPLETED_TURN_CLOSE);
  });
});
