import { logger } from '@keeper/shared';
import {
  KIP_AGENT_OUTPUT_CONTRACT_ID,
  type StructureContractId,
} from '@keeper/shared';
import { getStructureContract } from './contracts.js';
import {
  looksLikeJsonAttempt,
  parseKipAgentOutput,
  parsedFromRepairedJson,
  wrapProseAsAgentOutput,
  type ParsedAgentOutput,
} from './parseKipAgentOutput.js';
import { repairAgentOutputWithTogether } from './togetherStructureRepair.js';

export type EnsureStructuredOutputInput = {
  contractId: StructureContractId;
  raw: string;
  requestId?: string;
  userId?: string;
  allowedActions?: string[];
};

export async function ensureStructuredOutput(
  input: EnsureStructuredOutputInput,
): Promise<ParsedAgentOutput> {
  const contract = getStructureContract(input.contractId);
  if (!contract) {
    return {
      responseText: input.raw.trim() || input.raw,
      actions: [],
      raw: input.raw,
      ignoredReason: 'unknown_contract',
    };
  }

  if (input.contractId === KIP_AGENT_OUTPUT_CONTRACT_ID) {
    return ensureKipAgentOutput(input, contract);
  }

  return {
    responseText: input.raw.trim() || input.raw,
    actions: [],
    raw: input.raw,
    ignoredReason: 'contract_not_implemented',
  };
}

async function ensureKipAgentOutput(
  input: EnsureStructuredOutputInput,
  contract: NonNullable<ReturnType<typeof getStructureContract>>,
): Promise<ParsedAgentOutput> {
  let result = parseKipAgentOutput(input.raw, input.requestId);

  if (!result.ignoredReason) {
    return result;
  }

  const trimmed = input.raw.trim();

  if (
    result.ignoredReason === 'invalid_json'
    && contract.parseFallback === 'prose-wrap'
    && trimmed.length > 0
    && !looksLikeJsonAttempt(trimmed)
  ) {
    return wrapProseAsAgentOutput(trimmed);
  }

  if (
    contract.together.enabled
    && (result.ignoredReason === 'invalid_json' || result.ignoredReason === 'fenced_response')
  ) {
    try {
      const repairedJson = await repairAgentOutputWithTogether({
        raw: input.raw,
        model: contract.together.model,
        userId: input.userId,
        allowedActions: input.allowedActions,
      });
      if (repairedJson) {
        result = parsedFromRepairedJson(repairedJson, input.raw, input.requestId);
        if (!result.ignoredReason) {
          logger.info(
            { requestId: input.requestId, contractId: input.contractId },
            '[structure] Together repair succeeded',
          );
          return result;
        }
      }
    } catch (error) {
      logger.warn(
        {
          requestId: input.requestId,
          contractId: input.contractId,
          error: error instanceof Error ? error.message : error,
        },
        '[structure] Together repair failed',
      );
    }
  }

  if (trimmed.length > 0) {
    return {
      responseText: trimmed,
      actions: [],
      raw: input.raw,
      ignoredReason: result.ignoredReason ?? 'structure_repair_failed',
    };
  }

  return {
    responseText:
      'I had trouble formatting that response. Please try again.',
    actions: [],
    raw: input.raw,
    ignoredReason: result.ignoredReason ?? 'structure_repair_failed',
  };
}

/** Convenience wrapper for runAgent — same shape as legacy parseStructuredAgentResponse. */
export async function ensureKipAgentOutputEnvelope(
  raw: string,
  options?: { requestId?: string; userId?: string; allowedActions?: string[] },
): Promise<ParsedAgentOutput> {
  return ensureStructuredOutput({
    contractId: KIP_AGENT_OUTPUT_CONTRACT_ID,
    raw,
    requestId: options?.requestId,
    userId: options?.userId,
    allowedActions: options?.allowedActions,
  });
}

export type { ParsedAgentOutput, StructuredAgentAction } from './parseKipAgentOutput.js';
