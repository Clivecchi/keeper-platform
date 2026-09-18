import type { DomainInvitation, Prisma } from '@prisma/client';
import { prisma as defaultPrisma, type PrismaClient } from '@keeper/database';
import {
  buildInvitationArrivalSnapshot,
  mergeDialogContext,
  type DialogArrivalContext,
} from '@keeper/shared';
import { createChronicleEvent } from '../kip/chronicleEvents.js';
import { enableDialogCastMember } from './dialogCastMembership.js';

export type InvitationArrivalResult = {
  dialogId: string;
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
    summary: `${input.inviteeName} arrived as ${input.role}.`,
    anchor: { dialogId: input.dialogId, entityKind: 'dialog', breadcrumb: ['First Introduction'] },
  });
}

/**
 * Idempotent First Introduction: invitation-linked Dialog, typed context.arrival,
 * invitee Lead on Cast, structural Chronicle. Does not write seed as a Dialog message.
 */
export async function ensureInvitationArrival(params: {
  invitation: Pick<
    DomainInvitation,
    'id' | 'domainId' | 'originDomainId' | 'role' | 'invitedBy' | 'seed'
  >;
  userId: string;
  inviteeHomeDomainId: string | null;
  client?: PrismaClient;
}): Promise<InvitationArrivalResult | null> {
  const client = params.client ?? defaultPrisma;
  const invitation = params.invitation;
  const originDomainId = invitation.originDomainId ?? invitation.domainId;
  const snapshot = buildInvitationArrivalSnapshot({
    invitationId: invitation.id,
    inviteeUserId: params.userId,
    inviteeHomeDomainId: params.inviteeHomeDomainId,
    originDomainId,
    role: invitation.role,
    invitedByUserId: invitation.invitedBy,
    seed: invitation.seed,
  });

  const context = mergeDialogContext(
    { board: 'domain', frame: '', subject: 'invitation-arrival' },
    { arrival: snapshot },
  );

  let dialog = await client.dialog.findUnique({
    where: { invitationId: invitation.id },
    select: { id: true, context: true },
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
      select: { id: true, context: true },
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

  const [invitee, inviter] = await Promise.all([
    client.users.findUnique({
      where: { id: params.userId },
      select: { name: true, email: true },
    }),
    client.users.findUnique({
      where: { id: invitation.invitedBy },
      select: { name: true, email: true },
    }),
  ]);
  const originLead = await client.domain.findUnique({
    where: { id: originDomainId },
    select: { name: true, settings: true },
  });
  const inviteeName =
    snapshot.seed?.givenName?.trim() ||
    invitee?.name?.trim() ||
    invitee?.email?.trim() ||
    'Invitee';
  const actor =
    inviter?.name?.trim() || inviter?.email?.trim() || originLead?.name?.trim() || 'Domain lead';

  try {
    await recordArrivalChronicle({
      dialogId: dialog.id,
      domainId: invitation.domainId,
      inviteeName,
      role: invitation.role,
      actor,
    });
  } catch (error) {
    console.warn('[first-introduction] Chronicle structural event skipped', {
      dialogId: dialog.id,
      error,
    });
  }

  return { dialogId: dialog.id, arrival: snapshot };
}
