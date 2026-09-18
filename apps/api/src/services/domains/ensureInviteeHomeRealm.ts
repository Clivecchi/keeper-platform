import { randomUUID } from 'crypto';
import { prisma as defaultPrisma, type PrismaClient } from '@keeper/database';
import { ensureDomainAgentPolicy } from '../../governance/index.js';
import { provisionDomainOnCreate } from './provisionDomainOnCreate.js';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^(-)+|(-)+$/g, '')
    .slice(0, 40);
}

/**
 * Every registered Keeper has a personal/home Domain and Lead, including invitees.
 * Invitation adds DomainPermission; it does not replace this Realm.
 */
export async function ensureInviteeHomeRealm(
  userId: string,
  client: PrismaClient = defaultPrisma,
): Promise<{ id: string; slug: string } | null> {
  const owned = await client.domain.findFirst({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      ownerId: true,
      settings: true,
      theme: true,
      frame_json: true,
    },
  });

  if (owned) {
    await client.users
      .updateMany({
        where: { id: userId, primaryDomainId: null },
        data: { primaryDomainId: owned.id },
      })
      .catch((error) => {
        console.warn('[first-introduction] failed to set primaryDomainId on existing home Realm', {
          userId,
          domainId: owned.id,
          error,
        });
      });
    await provisionDomainOnCreate(client, { domain: owned }).catch((error) => {
      console.warn('[first-introduction] home Realm provision failed', {
        userId,
        domainId: owned.id,
        error,
      });
    });
    return { id: owned.id, slug: owned.slug };
  }

  const user = await client.users.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const display = user?.name?.trim() || user?.email?.split('@')[0]?.trim() || 'Keeper';
  const suffix = userId.replace(/-/g, '').slice(0, 8);
  const baseSlug = slugify(display) || 'keeper';
  const slug = `${baseSlug}-${suffix}`.slice(0, 48);
  const name = `${display} (${suffix})`;
  const domainId = randomUUID();

  try {
    await client.domain.create({
      data: {
        id: domainId,
        name,
        slug,
        ownerId: userId,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        features: {},
        settings: {},
      },
    });
  } catch (error) {
    console.warn('[first-introduction] home Realm create failed', { userId, error });
    const raced = await client.domain.findFirst({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true },
    });
    return raced;
  }

  await ensureDomainAgentPolicy(domainId).catch((error) => {
    console.warn('[first-introduction] home Realm agent policy failed', { userId, domainId, error });
  });

  const created = await client.domain.findUnique({ where: { id: domainId } });
  if (!created) return null;
  await provisionDomainOnCreate(client, { domain: created }).catch((error) => {
    console.warn('[first-introduction] home Realm provision after create failed', {
      userId,
      domainId,
      error,
    });
  });
  return { id: created.id, slug: created.slug };
}
