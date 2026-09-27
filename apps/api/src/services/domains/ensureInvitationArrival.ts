import type { DomainInvitation, Prisma } from '@prisma/client';
import { prisma as defaultPrisma, type PrismaClient } from '@keeper/database';
import {
  buildInvitationArrivalSnapshot,
  mergeDialogContext,
  type DialogArrivalContext,
  type InvitationArrivalDialogDoor,
  type InvitationArrivalDoor,
} from '@keeper/shared';
import { createChronicleEvent } from '../kip/chronicleEvents.js';
import { enableDialogCastMember } from './dialogCastMembership.js';
import { ensureDialogHumanMember } from './dialogHumanMembership.js';
import { resolveDomainLeadAgentFromDomain } from './resolveDomainLeadAgent.js';

export type InvitationArrivalResult = {
  dialogId: string;
  homeDialogId?: string;
  arrival: DialogArrivalContext;
};

function arrivalTitle(seedGivenName: string | undefined): string {
  const name = seedGivenName?.trim();
  return name ? `First Introduction · ${name}` : 'First Introduction';
}

async function recordArrivalChronicle(input: {
  dialogId: string;
  domainId: string;
  inviteeName: string;
  role: string;
  actor: string;
  actorSlug?: string | null;
}): Promise<void> {
  const existing = await defaultPrisma.chronicleEvent.findFirst({
    where: {
      dialogId: input.dialogId,
      domainId: input.domainId,
      eventType: 'structural',
      title: { startsWith: 'First Introduction' },
    },
    select: { id: true },
  });
  if (existing) return;
  await createChronicleEvent({
    dialogId: input.dialogId,
    domainId: input.domainId,
    actor: input.actor,
    actorSlug: input.actorSlug ?? undefined,
    eventType: 'structural',
    title: 'First Introduction',
    summary: `${input.inviteeName} arrived as ${input.role}. The inviter is in this Dialog with them.`,
    anchor: { dialogId: input.dialogId, entityKind: 'dialog', breadcrumb: ['First Introduction'] },
  });
}

async function attachPair(params: {
  dialogId: string;
  inviteeUserId: string;
  inviterUserId: string;
  inviteeHomeDomainId: string | null;
  originDomainId: string;
}): Promise<void> {
  await ensureDialogHumanMember({
    dialogId: params.dialogId,
    userId: params.inviteeUserId,
    addedByUserId: params.inviterUserId,
    homeDomainId: params.inviteeHomeDomainId,
    source: 'invitation',
  });
  if (params.inviterUserId !== params.inviteeUserId) {
    await ensureDialogHumanMember({
      dialogId: params.dialogId,
      userId: params.inviterUserId,
      addedByUserId: params.inviterUserId,
      homeDomainId: params.originDomainId,
      source: 'invitation',
    });
  }
}

/**
 * Idempotent First Introduction on the inviting Domain, plus a home Dialog
 * that lists doors. Humans share the inviting Dialog. Dialogs are not copied.
 */
export async function ensureInvitationArrival(params: {
  invitation: Pick<
    DomainInvitation,
    'id' | 'domainId' | 'originDomainId' | 'role' | 'invitedBy' | 'seed'
  >;
  userId: string;
  inviteeHomeDomainId: string | null;
  doors?: InvitationArrivalDoor[];
  assignedDialogs?: InvitationArrivalDialogDoor[];
  client?: PrismaClient;
}): Promise<InvitationArrivalResult | null> {
  const client = params.client ?? defaultPrisma;
  const invitation = params.invitation;
  const originDomainId = invitation.originDomainId ?? invitation.domainId;

  const [invitee, inviter, originDomain] = await Promise.all([
    client.users.findUnique({
      where: { id: params.userId },
      select: { name: true, email: true },
    }),
    client.users.findUnique({
      where: { id: invitation.invitedBy },
      select: { name: true, email: true },
    }),
    client.domain.findUnique({
      where: { id: originDomainId },
      select: { id: true, name: true, slug: true, settings: true, frame_json: true },
    }),
  ]);

  let originLeadName: string | null = null;
  if (originDomain) {
    const lead = await resolveDomainLeadAgentFromDomain(client, originDomain);
    originLeadName = lead?.name?.trim() || null;
  }
  const inviterName =
    inviter?.name?.trim() || inviter?.email?.trim() || originDomain?.name?.trim() || 'Someone';

  const snapshot = buildInvitationArrivalSnapshot({
    invitationId: invitation.id,
    inviteeUserId: params.userId,
    inviteeHomeDomainId: params.inviteeHomeDomainId,
    originDomainId,
    role: invitation.role,
    invitedByUserId: invitation.invitedBy,
    seed: invitation.seed,
    inviterName,
    originDomainName: originDomain?.name ?? null,
    originLeadName,
    doors: params.doors,
    assignedDialogs: params.assignedDialogs,
  });

  const context = mergeDialogContext(
    { board: 'domain', frame: '', subject: 'invitation-arrival' },
    { arrival: snapshot },
  );

  let dialog = await client.dialog.findUnique({
    where: { invitationId: invitation.id },
    select: { id: true, context: true, domain_id: true },
  });

  if (!dialog) {
    dialog = await client.dialog.create({
      data: {
        title: arrivalTitle(snapshot.seed?.givenName),
        title_source: 'user_set',
        domain_id: invitation.domainId,
        user_id: null,
        available_to: ['member'],
        invitationId: invitation.id,
        context: context as unknown as Prisma.InputJsonValue,
      },
      select: { id: true, context: true, domain_id: true },
    });
  } else {
    const merged = mergeDialogContext(dialog.context, { arrival: snapshot });
    await client.dialog.update({
      where: { id: dialog.id },
      data: { context: merged as unknown as Prisma.InputJsonValue },
    });
  }

  if (params.inviteeHomeDomainId && params.inviteeHomeDomainId !== invitation.domainId) {
    try {
      await enableDialogCastMember({
        userId: params.userId,
        domainId: invitation.domainId,
        dialogId: dialog.id,
        homeDomainId: params.inviteeHomeDomainId,
      });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      console.warn('[first-introduction] invitee Lead Cast enable skipped', {
        dialogId: dialog.id,
        homeDomainId: params.inviteeHomeDomainId,
        code,
        error,
      });
    }
  }

  try {
    await attachPair({
      dialogId: dialog.id,
      inviteeUserId: params.userId,
      inviterUserId: invitation.invitedBy,
      inviteeHomeDomainId: params.inviteeHomeDomainId,
      originDomainId,
    });
  } catch (error) {
    console.warn('[first-introduction] human membership skipped', {
      dialogId: dialog.id,
      error,
    });
  }

  for (const assigned of params.assignedDialogs ?? []) {
    if (assigned.dialogId === dialog.id) continue;
    try {
      await attachPair({
        dialogId: assigned.dialogId,
        inviteeUserId: params.userId,
        inviterUserId: invitation.invitedBy,
        inviteeHomeDomainId: params.inviteeHomeDomainId,
        originDomainId,
      });
    } catch (error) {
      console.warn('[first-introduction] assigned Dialog membership skipped', {
        dialogId: assigned.dialogId,
        error,
      });
    }
  }

  const inviteeName =
    snapshot.seed?.givenName?.trim() ||
    invitee?.name?.trim() ||
    invitee?.email?.trim() ||
    'Invitee';

  try {
    await recordArrivalChronicle({
      dialogId: dialog.id,
      domainId: dialog.domain_id,
      inviteeName,
      role: invitation.role,
      actor: inviterName,
    });
  } catch (error) {
    console.warn('[first-introduction] Chronicle structural event skipped', {
      dialogId: dialog.id,
      error,
    });
  }

  let homeDialogId: string | undefined;
  if (params.inviteeHomeDomainId && params.inviteeHomeDomainId !== invitation.domainId) {
    homeDialogId = await ensureHomeArrivalDialog({
      client,
      homeDomainId: params.inviteeHomeDomainId,
      invitationId: invitation.id,
      sharedDialogId: dialog.id,
      title: arrivalTitle(snapshot.seed?.givenName),
      snapshot,
      inviterUserId: invitation.invitedBy,
      originDomainId,
    });
  }

  return {
    dialogId: dialog.id,
    ...(homeDialogId ? { homeDialogId } : {}),
    arrival: snapshot,
  };
}

async function ensureHomeArrivalDialog(params: {
  client: PrismaClient;
  homeDomainId: string;
  invitationId: string;
  sharedDialogId: string;
  title: string;
  snapshot: DialogArrivalContext;
  inviterUserId: string;
  originDomainId: string;
}): Promise<string | undefined> {
  const homeSnapshot = buildInvitationArrivalSnapshot({
    invitationId: params.invitationId,
    inviteeUserId: params.snapshot.inviteeUserId,
    inviteeHomeDomainId: params.homeDomainId,
    originDomainId: params.snapshot.originDomainId,
    role: params.snapshot.role,
    invitedByUserId: params.snapshot.invitedByUserId,
    seed: params.snapshot.seed,
    inviterName: params.snapshot.inviterName,
    originDomainName: params.snapshot.originDomainName,
    originLeadName: params.snapshot.originLeadName,
    sharedDialogId: params.sharedDialogId,
    homeDirectory: true,
    doors: params.snapshot.doors,
    assignedDialogs: params.snapshot.assignedDialogs,
  });
  const context = mergeDialogContext(
    { board: 'realm', frame: '', subject: 'invitation-arrival' },
    { arrival: homeSnapshot },
  );

  const existing = await params.client.dialog.findFirst({
    where: {
      domain_id: params.homeDomainId,
      is_archived: false,
      context: {
        path: ['arrival', 'invitationId'],
        equals: params.invitationId,
      },
    },
    select: { id: true, context: true },
  });

  let homeDialogId = existing?.id;
  if (!homeDialogId) {
    const created = await params.client.dialog.create({
      data: {
        title: params.title,
        title_source: 'user_set',
        domain_id: params.homeDomainId,
        user_id: null,
        available_to: ['member'],
        context: context as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    homeDialogId = created.id;
  } else {
    const merged = mergeDialogContext(existing?.context, { arrival: homeSnapshot });
    await params.client.dialog.update({
      where: { id: homeDialogId },
      data: { context: merged as unknown as Prisma.InputJsonValue },
    });
  }

  try {
    await ensureDialogHumanMember({
      dialogId: homeDialogId,
      userId: params.snapshot.inviteeUserId,
      addedByUserId: params.inviterUserId,
      homeDomainId: params.homeDomainId,
      source: 'invitation',
    });
  } catch (error) {
    console.warn('[first-introduction] home Dialog membership skipped', { homeDialogId, error });
  }

  if (params.originDomainId !== params.homeDomainId) {
    try {
      await enableDialogCastMember({
        userId: params.inviterUserId,
        domainId: params.homeDomainId,
        dialogId: homeDialogId,
        homeDomainId: params.originDomainId,
      });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      console.warn('[first-introduction] origin Lead on home Dialog skipped', {
        homeDialogId,
        code,
        error,
      });
    }
  }

  return homeDialogId;
}
