import { logger } from '@keeper/shared';

export type AnthropicFrameSliceInput = {
  existingJson: object | null;
  frameKey: string;
  domainSlug: string;
  authoringIntent: string;
  conversationContext: string;
  apiKey: string;
  requestId?: string;
};

export async function generateFrameSliceWithAnthropic(
  input: AnthropicFrameSliceInput,
): Promise<unknown | null> {
  logger.info({ requestId: input.requestId, frameKey: input.frameKey }, '[structure] Anthropic frame JSON fallback');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: input.apiKey });

  const systemPrompt = [
    `You are authoring the \`${input.frameKey}\` frame JSON block for the Keeper domain "${input.domainSlug}".`,
    '',
    `Current \`${input.frameKey}\` content:`,
    input.existingJson ? JSON.stringify(input.existingJson, null, 2) : '{}',
    '',
    `Authoring intent: ${input.authoringIntent}`,
    input.conversationContext ? `\nContext from Kip: ${input.conversationContext}` : '',
    '',
    'IMPORTANT: Respond ONLY with a valid JSON object — no explanation, no markdown, no code fences.',
    'Preserve all existing fields. Update only what was requested.',
    'All string values must be meaningful, brand-appropriate content for this domain.',
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.2,
    system: systemPrompt,
    messages: [{ role: 'user', content: `Produce the updated \`${input.frameKey}\` frame JSON object.` }],
  } as any);

  const text = ((response as { content?: Array<{ type?: string; text?: string }> }).content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('');

  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  try {
    return JSON.parse(stripped) as unknown;
  } catch {
    return null;
  }
}
