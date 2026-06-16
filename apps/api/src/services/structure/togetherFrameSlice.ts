import { logger } from '@keeper/shared';
import { STRUCTURE_TOGETHER_DEFAULT_MODEL } from './contracts.js';
import { resolveTogetherApiKey } from './togetherApiKey.js';

export type TogetherFrameSliceInput = {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: object;
  model?: string;
  userId?: string;
  requestId?: string;
};

/**
 * Generate a schema-constrained frame JSON block via Together AI.
 * Structure pipeline always sends response_format (not gated by model capability map).
 */
export async function generateFrameSliceWithTogether(
  input: TogetherFrameSliceInput,
): Promise<unknown | null> {
  const apiKey = await resolveTogetherApiKey(input.userId);
  if (!apiKey) return null;

  const model = input.model ?? STRUCTURE_TOGETHER_DEFAULT_MODEL;

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object', schema: input.jsonSchema },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.warn(
      { requestId: input.requestId, status: response.status, errText: errText.slice(0, 200) },
      '[structure] Together frame generation failed',
    );
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
