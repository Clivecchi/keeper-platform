/**
 * Domain access keys — create, list, revoke, and authenticate MCP callers.
 */
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@keeper/database';
import {
  DOMAIN_ACCESS_KEY_SCOPES,
  isDomainAccessKeyScope,
  type DomainAccessKeyCreateResult,
  type DomainAccessKeyRecord,
} from '@keeper/shared';

export function hashDomainAccessKey(raw: string): string {
  return createHash('sha256').update(raw.trim()).digest('hex');
}

export function generateDomainAccessKeyMaterial(): {
  secret: string;
  key_prefix: string;
  key_hash: string;
} {
  const suffix = randomBytes(24).toString('base64url');
  const secret = `keeper_dak_${suffix}`;
  return {
    secret,
    key_prefix: secret.slice(0, 20),
    key_hash: hashDomainAccessKey(secret),
  };
}

function toRecord(row: {
  id: string;
  domain_id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): DomainAccessKeyRecord {
  return {
    id: row.id,
    domain_id: row.domain_id,
    label: row.label,
    key_prefix: row.key_prefix,
    scopes: row.scopes,
    status: row.status === 'revoked' ? 'revoked' : 'active',
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listDomainAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const rows = await prisma.domainAccessKey.findMany({
    where: { domain_id: domainId },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(toRecord);
}

export async function createDomainAccessKey(params: {
  domainId: string;
  label: string;
  scopes: string[];
  createdBy?: string | null;
  expiresAt?: Date | null;
}): Promise<DomainAccessKeyCreateResult> {
  const label = params.label.trim();
  if (!label) throw new Error('Label is required');

  const scopes = params.scopes.filter(isDomainAccessKeyScope);
  if (scopes.length === 0) {
    throw new Error(`At least one scope is required (${DOMAIN_ACCESS_KEY_SCOPES.join(', ')})`);
  }

  const material = generateDomainAccessKeyMaterial();
  const row = await prisma.domainAccessKey.create({
    data: {
      domain_id: params.domainId,
      label,
      key_prefix: material.key_prefix,
      key_hash: material.key_hash,
      scopes,
      status: 'active',
      expires_at: params.expiresAt ?? null,
      created_by: params.createdBy ?? null,
    },
  });

  return {
    ...toRecord(row),
    secret: material.secret,
  };
}

export async function revokeDomainAccessKey(params: {
  domainId: string;
  id: string;
}): Promise<DomainAccessKeyRecord> {
  const existing = await prisma.domainAccessKey.findFirst({
    where: { id: params.id, domain_id: params.domainId },
  });
  if (!existing) throw new Error('Access key not found');

  const row = await prisma.domainAccessKey.update({
    where: { id: params.id },
    data: { status: 'revoked' },
  });
  return toRecord(row);
}

export async function updateDomainAccessKeyLabel(params: {
  domainId: string;
  id: string;
  label: string;
}): Promise<DomainAccessKeyRecord> {
  const label = params.label.trim();
  if (!label) throw new Error('Label is required');

  const existing = await prisma.domainAccessKey.findFirst({
    where: { id: params.id, domain_id: params.domainId },
  });
  if (!existing) throw new Error('Access key not found');

  const row = await prisma.domainAccessKey.update({
    where: { id: params.id },
    data: { label },
  });
  return toRecord(row);
}

export type DomainAccessKeyAuthMatch = {
  domainId: string;
  scopes: string[];
  keyId: string;
};

export async function authenticateDomainAccessKey(
  rawKey: string,
): Promise<DomainAccessKeyAuthMatch | null> {
  const trimmed = rawKey.trim();
  if (!trimmed.startsWith('keeper_dak_')) return null;

  const keyHash = hashDomainAccessKey(trimmed);
  const row = await prisma.domainAccessKey.findUnique({
    where: { key_hash: keyHash },
  });
  if (!row || row.status !== 'active') return null;
  if (row.expires_at && row.expires_at.getTime() < Date.now()) return null;

  void prisma.domainAccessKey
    .update({
      where: { id: row.id },
      data: { last_used_at: new Date() },
    })
    .catch((err) => console.warn('[domain-access-key:last_used]', err));

  return {
    domainId: row.domain_id,
    scopes: row.scopes,
    keyId: row.id,
  };
}
