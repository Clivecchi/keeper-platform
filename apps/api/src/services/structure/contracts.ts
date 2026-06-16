import {
  KIP_AGENT_OUTPUT_CONTRACT_ID,
  normalizeFrameRouteKey,
  toDomainFrameStructureContractId,
  type StructureContractId,
  type StructureContractMeta,
} from '@keeper/shared';
import { z } from 'zod';
import { agentOutputEnvelopeSchema } from '../../api/kip/actions/schema.js';
import { FRAME_SCHEMA_MAP } from '../../api/domains/frame-schemas.js';

export const STRUCTURE_TOGETHER_DEFAULT_MODEL = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

/** Permissive object schema until Zod frame schemas migrate from frame-schemas.ts (Phase 3 interim). */
export const domainFrameSliceSchema = z.record(z.string(), z.unknown());

export type RegisteredStructureContract = StructureContractMeta & {
  schema: z.ZodType;
  /** JSON Schema for Together guided decoding — domain.frame.* only. */
  jsonSchema?: object;
  frameKey?: string;
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

function buildDomainFrameStructureContracts(): Record<string, RegisteredStructureContract> {
  const out: Record<string, RegisteredStructureContract> = {};

  for (const [frameKey, jsonSchema] of Object.entries(FRAME_SCHEMA_MAP)) {
    if (!jsonSchema) continue;

    const contractId = toDomainFrameStructureContractId(frameKey);
    if (!contractId) continue;

    out[contractId] = {
      id: contractId,
      label: `Domain frame: ${normalizeFrameRouteKey(frameKey)}`,
      parseFallback: 'none',
      together: { enabled: true, model: STRUCTURE_TOGETHER_DEFAULT_MODEL },
      schema: domainFrameSliceSchema,
      jsonSchema,
      frameKey: normalizeFrameRouteKey(frameKey),
    };
  }

  return out;
}

export const DOMAIN_FRAME_STRUCTURE_CONTRACTS = buildDomainFrameStructureContracts();

const ALL_STRUCTURE_CONTRACTS: Record<string, RegisteredStructureContract> = {
  ...STRUCTURE_CONTRACTS,
  ...DOMAIN_FRAME_STRUCTURE_CONTRACTS,
};

export function getStructureContract(
  contractId: StructureContractId,
): RegisteredStructureContract | null {
  return ALL_STRUCTURE_CONTRACTS[contractId] ?? null;
}

/** Resolve `domain.frame.{frameKey}` contract id when the frame is JSON-governed. */
export function getDomainFrameStructureContractId(frameKey: string): StructureContractId | null {
  return toDomainFrameStructureContractId(frameKey);
}

export function hasDomainFrameStructureContract(frameKey: string): boolean {
  const id = getDomainFrameStructureContractId(frameKey);
  return id !== null && Boolean(ALL_STRUCTURE_CONTRACTS[id]?.jsonSchema);
}

export function listDomainFrameStructureContractIds(): StructureContractId[] {
  return Object.keys(DOMAIN_FRAME_STRUCTURE_CONTRACTS) as StructureContractId[];
}
