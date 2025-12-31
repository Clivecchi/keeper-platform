import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import { DEFAULT_POLICY_PACK_V1, DEFAULT_POLICY_VERSION, mapPolicyJsonToPack } from './policyPack.js';

type PolicyRecord = {
  version: string;
  policy: unknown;
  updatedAt?: Date | null;
  source: 'domain' | 'default';
};

export async function loadDomainPolicy(domainId: string): Promise<PolicyRecord> {
  try {
    const record = await prisma.domainPolicy.findUnique({
      where: { domainId },
      select: { version: true, policy: true, updatedAt: true },
    });

    if (record) {
      return {
        version: record.version || DEFAULT_POLICY_VERSION,
        policy: record.policy ?? DEFAULT_POLICY_PACK_V1,
        updatedAt: record.updatedAt,
        source: 'domain',
      };
    }
  } catch (error) {
    console.warn('[policy] Failed to load domain policy, falling back to default', { domainId, error });
  }

  return {
    version: DEFAULT_POLICY_VERSION,
    policy: DEFAULT_POLICY_PACK_V1,
    updatedAt: null,
    source: 'default',
  };
}

export async function upsertDomainPolicy(domainId: string, policy: unknown, version = DEFAULT_POLICY_VERSION) {
  const jsonPolicy = policy as Prisma.InputJsonValue;
  const saved = await prisma.domainPolicy.upsert({
    where: { domainId },
    update: { policy: jsonPolicy, version, updatedAt: new Date() },
    create: { domainId, version, policy: jsonPolicy },
    select: { version: true, policy: true, updatedAt: true },
  });

  return {
    version: saved.version || DEFAULT_POLICY_VERSION,
    policy: saved.policy ?? DEFAULT_POLICY_PACK_V1,
    updatedAt: saved.updatedAt,
    source: 'domain' as const,
  };
}

export async function resolvePolicyPackV1(args: { domainId: string; userId?: string; agentId?: string | null }) {
  const { domainId } = args;
  const basePolicy = await loadDomainPolicy(domainId);
  return mapPolicyJsonToPack((basePolicy as any)?.policy ?? basePolicy ?? DEFAULT_POLICY_PACK_V1);
}



