/**
 * Humans on a Dialog. Agents stay on DialogCastMember.
 * Invitation attaches inviter + invitee. Domain members with write may add someone later.
 */

import { prisma } from '@keeper/database';
import {
  parseDialogHumanMemberSource,
  type DialogHumanMemberRow,
  type DialogHumanMemberSource,
} from '@keeper/shared';

function coded(message: string): Error {
  const err = new Error(message);
  (err as Error & { code: string }).code = message;
  return err;
}

async function loadDialog(domainId: string, dialogId: string) {
  return prisma.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId, is_archived: false },
    select: { id: true, domain_id: true },
  });
}

async function userBelongsToDomain(userId: string, domainId: string): Promise<boolean> {
  const domain = await prisma.domain.findFirst({
    where: { id: domainId, deletedAt: null },
    select: { ownerId: true },
  });
  if (!domain) return false;
  if (domain.ownerId === userId) return true;
  const permission = await prisma.domainPermission.findFirst({
    where: {
      domainId,
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(permission);
}

function toRow(row: {
  userId: string;
  homeDomainId: string | null;
  addedAt: Date;
  source: string;
  user: { name: string | null; email: string | null };
  homeDomain: { slug: string } | null;
}): DialogHumanMemberRow {
  const displayName = row.user.name?.trim() || row.user.email?.trim() || 'Someone';
  return {
    userId: row.userId,
    displayName,
    email: row.user.email?.trim() || null,
    homeDomainId: row.homeDomainId,
    homeDomainSlug: row.homeDomain?.slug ?? null,
    addedAt: row.addedAt.toISOString(),
    source: parseDialogHumanMemberSource(row.source),
  };
}

export async function listDialogHumanMembers(params: {
  domainId: string;
  dialogId: string;
}): Promise<DialogHumanMemberRow[]> {
  const dialog = await loadDialog(params.domainId, params.dialogId);
  if (!dialog) throw coded('DIALOG_NOT_FOUND');
  const rows = await prisma.dialogHumanMember.findMany({
    where: { dialogId: params.dialogId },
    include: {
      user: { select: { name: true, email: true } },
      homeDomain: { select: { slug: true } },
    },
    orderBy: { addedAt: 'asc' },
  });
  return rows.map(toRow);
}

export async function addDialogHumanMember(params: {
  actorUserId: string;
  domainId: string;
  dialogId: string;
  userId: string;
  homeDomainId?: string | null;
  source?: DialogHumanMemberSource;
}): Promise<DialogHumanMemberRow> {
  const dialog = await loadDialog(params.domainId, params.dialogId);
  if (!dialog) throw coded('DIALOG_NOT_FOUND');
  const targetId = params.userId.trim();
  if (!targetId) throw coded('USER_REQUIRED');
  const [actorOk, targetOk, person] = await Promise.all([
    userBelongsToDomain(params.actorUserId, params.domainId),
    userBelongsToDomain(targetId, params.domainId),
    prisma.users.findUnique({
      where: { id: targetId },
      select: { id: true },
    }),
  ]);
  if (!person) throw coded('USER_NOT_FOUND');
  if (!actorOk || !targetOk) throw coded('DOMAIN_MEMBER_REQUIRED');
  return ensureDialogHumanMember({
    dialogId: dialog.id,
    userId: targetId,
    addedByUserId: params.actorUserId,
    homeDomainId: params.homeDomainId ?? null,
    source: params.source ?? 'manual',
  });
}

/** Server-side attach. Caller already decided these people belong in the Dialog. */
export async function ensureDialogHumanMember(params: {
  dialogId: string;
  userId: string;
  addedByUserId: string;
  homeDomainId?: string | null;
  source: DialogHumanMemberSource;
}): Promise<DialogHumanMemberRow> {
  const homeDomainId = params.homeDomainId?.trim() || null;
  const row = await prisma.dialogHumanMember.upsert({
    where: {
      dialogId_userId: {
        dialogId: params.dialogId,
        userId: params.userId,
      },
    },
    create: {
      dialogId: params.dialogId,
      userId: params.userId,
      addedByUserId: params.addedByUserId,
      source: params.source,
      ...(homeDomainId ? { homeDomainId } : {}),
    },
    update: {
      source: params.source,
      ...(homeDomainId ? { homeDomainId } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      homeDomain: { select: { slug: true } },
    },
  });
  return toRow(row);
}

export async function removeDialogHumanMember(params: {
  domainId: string;
  dialogId: string;
  userId: string;
}): Promise<void> {
  const dialog = await loadDialog(params.domainId, params.dialogId);
  if (!dialog) throw coded('DIALOG_NOT_FOUND');
  const existing = await prisma.dialogHumanMember.findUnique({
    where: {
      dialogId_userId: { dialogId: params.dialogId, userId: params.userId },
    },
    select: { id: true },
  });
  if (!existing) throw coded('HUMAN_MEMBER_NOT_FOUND');
  await prisma.dialogHumanMember.delete({ where: { id: existing.id } });
}

export async function userIsDialogHumanMember(
  userId: string,
  dialogId: string | null | undefined,
): Promise<boolean> {
  const dialog = dialogId?.trim();
  const user = userId.trim();
  if (!dialog || !user) return false;
  const row = await prisma.dialogHumanMember.findUnique({
    where: { dialogId_userId: { dialogId: dialog, userId: user } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function dialogHasHumanMembers(dialogId: string): Promise<boolean> {
  const count = await prisma.dialogHumanMember.count({
    where: { dialogId },
  });
  return count > 0;
}
