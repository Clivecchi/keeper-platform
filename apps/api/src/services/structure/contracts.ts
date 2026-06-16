import {
  KIP_AGENT_OUTPUT_CONTRACT_ID,
  type StructureContractId,
  type StructureContractMeta,
} from '@keeper/shared';
import { agentOutputEnvelopeSchema } from '../../api/kip/actions/schema.js';
import type { z } from 'zod';

export const STRUCTURE_TOGETHER_DEFAULT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

export type RegisteredStructureContract = StructureContractMeta & {
  schema: z.ZodType;
};

export const STRUCTURE_CONTRACTS: Record<
  typeof KIP_AGENT_OUTPUT_CONTRACT_ID,
  RegisteredStructureContract
> = {
  [KIP_AGENT_OUTPUT_CONTRACT_ID]: {
    id: KIP_AGENT_OUTPUT_CONTRACT_ID,
    label: 'Kip agent output',
    parseFallback: 'prose-wrap',
    together: { enabled: true, model: STRUCTURE_TOGETHER_DEFAULT_MODEL },
    schema: agentOutputEnvelopeSchema,
  },
};

export function getStructureContract(
  contractId: StructureContractId,
): RegisteredStructureContract | null {
  if (contractId === KIP_AGENT_OUTPUT_CONTRACT_ID) {
    return STRUCTURE_CONTRACTS[KIP_AGENT_OUTPUT_CONTRACT_ID];
  }
  return null;
}
