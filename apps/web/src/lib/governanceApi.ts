/**
 * Governance API client
 */

import { apiFetch } from './api.js';

export interface DomainGovernance {
  policyId: string;
  domainId: string;
  contractId: string;
  contractName: string;
  contractVersion: string;
  enforcementMode: 'strict' | 'warn' | 'off';
}

export interface ContractDetail {
  id: string;
  name: string;
  version: string;
  contractText: string;
  enforceDraft: boolean;
  enforceAction: boolean;
  enforceToolFirst: boolean;
  enforceErrorRecovery: boolean;
  publishedAt: string | null;
}

export interface ComplianceMetrics {
  logs: Array<{
    id: string;
    ruleKey: string;
    required: boolean;
    present: boolean;
    passed: boolean;
    enforcementMode: string;
    createdAt: string;
    metadata?: unknown;
  }>;
  metrics: {
    draftTriggerSuccessPct: number | null;
    toolFirstViolations: number;
    totalChecks: number;
  };
}

export async function getDomainGovernance(domainId: string): Promise<DomainGovernance | null> {
  const res = await apiFetch(`/api/domains/${domainId}/governance`);
  if (res?.error || res?.policyId === undefined) return null;
  return res as DomainGovernance;
}

export async function updateDomainGovernance(
  domainId: string,
  payload: { enforcementMode?: 'strict' | 'warn' | 'off'; contractId?: string }
): Promise<DomainGovernance | null> {
  const res = await apiFetch(`/api/domains/${domainId}/governance`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (res?.error || res?.policyId === undefined) return null;
  return res as DomainGovernance;
}

export async function getContractDetail(contractId: string): Promise<ContractDetail | null> {
  const res = await apiFetch(`/api/governance/contracts/${contractId}`);
  if (res?.error || res?.id === undefined) return null;
  return res as ContractDetail;
}

export async function getDomainCompliance(
  domainId: string,
  limit = 100
): Promise<ComplianceMetrics | null> {
  const res = await apiFetch(`/api/domains/${domainId}/governance/compliance?limit=${limit}`);
  if (res?.error || res?.logs === undefined) return null;
  return res as ComplianceMetrics;
}
