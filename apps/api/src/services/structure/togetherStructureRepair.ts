import { PlatformApiKeyService } from '../PlatformApiKeyService.js';
import { KipUserKeyService } from '../KipUserKeyService.js';
import { STRUCTURE_TOGETHER_DEFAULT_MODEL } from './contracts.js';

function validKey(k: string | null | undefined): string | null {
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;
}

async function resolveTogetherApiKey(userId?: string): Promise<string | null> {
  let apiKey = validKey(process.env.TOGETHER_API_KEY);
  if (apiKey) return apiKey;

  if (userId) {
    apiKey = validKey(await KipUserKeyService.getUserKey('together-ai', userId));
    if (apiKey) return apiKey;
  }

  return validKey(await PlatformApiKeyService.getKeyForProvider('together-ai'));
}

export type TogetherStructureRepairInput = {
  raw: string;
  model?: string;
  userId?: string;
  allowedActions?: string[];
};

/**
 * Ask Together AI to emit a valid agent_output JSON envelope from messy primary output.
 * Structure service always requests JSON object mode (not gated by model capability map).
 */
export async function repairAgentOutputWithTogether(
  input: TogetherStructureRepairInput,
): Promise<string | null> {
  const apiKey = await resolveTogetherApiKey(input.userId);
  if (!apiKey) return null;

  const model = input.model ?? STRUCTURE_TOGETHER_DEFAULT_MODEL;
  const allowed =
    input.allowedActions && input.allowedActions.length > 0
      ? input.allowedActions.join(', ')
      : 'draft.create, draft.update, draft.update.propose, sole.save, image.generate';

  const systemPrompt = [
    'You convert assistant output into a single JSON object for the Keeper platform.',
    'Output ONLY valid JSON — no markdown fences, no prose before or after.',
    'Required shape: {"type":"agent_output","response":"<user-facing message>","actions":[]}',
    'Put the full user-facing reply in "response".',
    'Include "actions" only when the source clearly requests a platform action; each action needs "type" and optional "payload".',
    `Allowed action types: ${allowed}.`,
    'Never invent action types such as add_point.',
  ].join('\n');

  const userPrompt = [
    'Convert this assistant output into the agent_output JSON envelope:',
    '',
    input.raw.slice(0, 12_000),
  ].join('\n');

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : null;
}
