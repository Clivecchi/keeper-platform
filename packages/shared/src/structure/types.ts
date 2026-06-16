/**
 * Structure contract IDs — stable keys for ensureStructuredOutput.
 * Phase 1: kip.agent_output only. domain.frame.* added in later phases.
 */

export const KIP_AGENT_OUTPUT_CONTRACT_ID = 'kip.agent_output' as const;

/** Governed domain frame slices — registered in later phases. */
export type DomainFrameStructureContractId = `domain.frame.${string}`;

export type StructureContractId =
  | typeof KIP_AGENT_OUTPUT_CONTRACT_ID
  | DomainFrameStructureContractId;

export type StructureParseFallback = 'prose-wrap' | 'none';

export type StructureTogetherPolicy = {
  enabled: boolean;
  /** Default structure-repair model on Together AI. */
  model?: string;
};

export type StructureContractMeta = {
  id: StructureContractId;
  label: string;
  parseFallback: StructureParseFallback;
  together: StructureTogetherPolicy;
};
