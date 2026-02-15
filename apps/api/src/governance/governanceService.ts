/**
 * Domain Governance Service
 * Loads AgentContract, DomainAgentPolicy, and produces AgentPolicyView.
 */

import { prisma } from '@keeper/database';
import type { ComplianceEventInput } from './types.js';

/** Default contract ID from migration seed (Keeper Agent Contract v1.1) */
const DEFAULT_CONTRACT_ID = 'clx_gov_contract_v11';

export interface DomainAgentPolicyWithContract {
  id: string;
  domainId: string;
  contractId: string;
  enforcementMode: string;
  contract: {
    id: string;
    name: string;
    version: string;
    enforceDraft: boolean;
    enforceAction: boolean;
    enforceToolFirst: boolean;
    enforceErrorRecovery: boolean;
  };
}

export async function loadDomainAgentPolicy(
  domainId: string
): Promise<DomainAgentPolicyWithContract | null> {
  const policy = await prisma.domainAgentPolicy.findUnique({
    where: { domainId },
    include: {
      contract: {
        select: {
          id: true,
          name: true,
          version: true,
          enforceDraft: true,
          enforceAction: true,
          enforceToolFirst: true,
          enforceErrorRecovery: true,
        },
      },
    },
  });

  if (!policy) return null;

  return {
    id: policy.id,
    domainId: policy.domainId,
    contractId: policy.contractId,
    enforcementMode: policy.enforcementMode,
    contract: policy.contract,
  };
}

export async function loadAgentContract(contractId: string) {
  return prisma.agentContract.findUnique({
    where: { id: contractId },
  });
}

/**
 * Ensure a domain has a DomainAgentPolicy. Creates one with default contract (warn mode) if missing.
 * Call this when creating new domains so they receive governance by default.
 */
export async function ensureDomainAgentPolicy(
  domainId: string,
  opts?: { contractId?: string; enforcementMode?: 'strict' | 'warn' | 'off' }
): Promise<DomainAgentPolicyWithContract | null> {
  const existing = await loadDomainAgentPolicy(domainId);
  if (existing) return existing;

  const contractId = opts?.contractId ?? DEFAULT_CONTRACT_ID;
  const enforcementMode = opts?.enforcementMode ?? 'warn';

  const contract = await loadAgentContract(contractId);
  if (!contract) {
    console.warn('[governance] Default contract not found, skipping ensureDomainAgentPolicy');
    return null;
  }

  const policy = await prisma.domainAgentPolicy.create({
    data: {
      domainId,
      contractId,
      enforcementMode,
    },
    include: {
      contract: {
        select: {
          id: true,
          name: true,
          version: true,
          enforceDraft: true,
          enforceAction: true,
          enforceToolFirst: true,
          enforceErrorRecovery: true,
        },
      },
    },
  });

  return {
    id: policy.id,
    domainId: policy.domainId,
    contractId: policy.contractId,
    enforcementMode: policy.enforcementMode,
    contract: policy.contract,
  };
}

/**
 * Backfill: ensure all domains have a DomainAgentPolicy. Returns count of newly created policies.
 */
export async function ensureAllDomainsHaveAgentPolicy(): Promise<number> {
  const domainsWithoutPolicy = await prisma.domain.findMany({
    where: {
      agentPolicy: null,
    },
    select: { id: true },
  });

  let created = 0;
  for (const d of domainsWithoutPolicy) {
    const policy = await ensureDomainAgentPolicy(d.id);
    if (policy) created++;
  }
  return created;
}

export async function getAgentPolicyView(domainId: string) {
  const policy = await loadDomainAgentPolicy(domainId);
  if (!policy) return null;

  return {
    contract: policy.contract,
    enforcement: {
      mode: policy.enforcementMode as 'strict' | 'warn' | 'off',
    },
  };
}

export async function logComplianceEvent(event: ComplianceEventInput): Promise<void> {
  try {
    await prisma.governanceComplianceLog.create({
      data: {
        domainId: event.domainId,
        agentId: event.agentId ?? undefined,
        sessionId: event.sessionId ?? undefined,
        runId: event.runId ?? undefined,
        ruleKey: event.ruleKey,
        required: event.required,
        present: event.present,
        passed: event.passed,
        enforcementMode: event.enforcementMode,
        metadata: (event.metadata ?? {}) as object,
      },
    });
  } catch (err) {
    console.warn('[governance] Failed to log compliance event:', err);
  }
}
