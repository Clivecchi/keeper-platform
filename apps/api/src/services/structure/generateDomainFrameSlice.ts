import { logger } from '@keeper/shared';
import type { StructureContractId } from '@keeper/shared';
import { getStructureContract } from './contracts.js';
import { generateFrameSliceWithAnthropic } from './anthropicFrameSlice.js';
import { generateFrameSliceWithTogether } from './togetherFrameSlice.js';

export type GenerateDomainFrameSliceInput = {
  contractId: StructureContractId;
  frameKey: string;
  domainSlug: string;
  authoringIntent: string;
  conversationContext: string;
  currentSlice: unknown;
  userId?: string;
  requestId?: string;
  anthropicApiKey: string;
};

export type GenerateDomainFrameSliceResult = {
  ok: boolean;
  data: unknown | null;
  source: 'together' | 'anthropic' | 'none';
};

function toExistingObject(slice: unknown): object | null {
  if (slice && typeof slice === 'object' && !Array.isArray(slice)) {
    return slice as object;
  }
  return null;
}

function validateFrameSlice(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

function buildTogetherPrompts(
  input: GenerateDomainFrameSliceInput,
  existingObject: object | null,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    `You are authoring the \`${input.frameKey}\` frame JSON block for the Keeper domain "${input.domainSlug}".`,
    'Your output must strictly match the provided JSON schema — every required field must be present, no extra keys allowed.',
    '',
    'All string values must be meaningful, brand-appropriate content for this domain. Do not use placeholder text.',
    '',
    `Current \`${input.frameKey}\` content:`,
    existingObject ? JSON.stringify(existingObject, null, 2) : '{}',
    '',
    `Authoring intent: ${input.authoringIntent}`,
    '',
    `Proposed approach from Kip: ${input.conversationContext}`,
    '',
    `Produce the complete updated \`${input.frameKey}\` JSON object. Preserve all existing fields; update only what was requested.`,
  ].join('\n');

  return {
    systemPrompt,
    userPrompt: `Produce the updated \`${input.frameKey}\` frame JSON object.`,
  };
}

/**
 * Generate a governed domain frame slice via structure contracts (Together → Anthropic fallback).
 */
export async function generateDomainFrameSlice(
  input: GenerateDomainFrameSliceInput,
): Promise<GenerateDomainFrameSliceResult> {
  const contract = getStructureContract(input.contractId);
  if (!contract?.jsonSchema) {
    return { ok: false, data: null, source: 'none' };
  }

  const existingObject = toExistingObject(input.currentSlice);
  const { systemPrompt, userPrompt } = buildTogetherPrompts(input, existingObject);

  const togetherResult = await generateFrameSliceWithTogether({
    systemPrompt,
    userPrompt,
    jsonSchema: contract.jsonSchema,
    model: contract.together.model,
    userId: input.userId,
    requestId: input.requestId,
  });

  if (validateFrameSlice(togetherResult)) {
    logger.info(
      { requestId: input.requestId, contractId: input.contractId, frameKey: input.frameKey },
      '[structure] Together frame slice generated',
    );
    return { ok: true, data: togetherResult, source: 'together' };
  }

  const anthropicResult = await generateFrameSliceWithAnthropic({
    existingJson: existingObject,
    frameKey: input.frameKey,
    domainSlug: input.domainSlug,
    authoringIntent: input.authoringIntent,
    conversationContext: input.conversationContext,
    apiKey: input.anthropicApiKey,
    requestId: input.requestId,
  });

  if (validateFrameSlice(anthropicResult)) {
    logger.info(
      { requestId: input.requestId, contractId: input.contractId, frameKey: input.frameKey },
      '[structure] Anthropic frame slice fallback generated',
    );
    return { ok: true, data: anthropicResult, source: 'anthropic' };
  }

  logger.warn(
    { requestId: input.requestId, contractId: input.contractId, frameKey: input.frameKey },
    '[structure] frame slice generation failed',
  );
  return { ok: false, data: null, source: 'none' };
}
