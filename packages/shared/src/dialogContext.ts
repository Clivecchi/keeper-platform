import {
  formatInvitationSeedForAgent,
  invitationSeedHasContent,
  normalizeInvitationSeed,
  type InvitationSeed,
} from './invitationSeed.js';

/** Seed is inviter direction for the origin Lead — not a Dialog message. */
export const INTRODUCTION_PURPOSE_LEAD_DIRECTION = 'lead-direction' as const;

export type IntroductionPurpose = typeof INTRODUCTION_PURPOSE_LEAD_DIRECTION;

export type DialogArrivalContext = {
  kind: 'invitation-arrival';
  invitationId: string;
  inviteeUserId: string;
  inviteeHomeDomainId: string | null;
  originDomainId: string;
  role: string;
  invitedByUserId: string;
  introductionPurpose: IntroductionPurpose;
  seed: InvitationSeed | null;
};

export type DialogContextShape = {
  board: string;
  frame: string;
  subject: string;
  arrival?: DialogArrivalContext;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Typed First Introduction snapshot on Dialog.context.
 * Seed stays Lead direction; a later sibling field can hold public invitation copy.
 */
export function parseDialogArrivalContext(context: unknown): DialogArrivalContext | null {
  const root = asRecord(context);
  const arrival = asRecord(root?.arrival);
  if (!arrival) return null;
  if (arrival.kind !== 'invitation-arrival') return null;

  const invitationId = asTrimmedString(arrival.invitationId);
  const inviteeUserId = asTrimmedString(arrival.inviteeUserId);
  const originDomainId = asTrimmedString(arrival.originDomainId);
  const role = asTrimmedString(arrival.role);
  const invitedByUserId = asTrimmedString(arrival.invitedByUserId);
  if (!invitationId || !inviteeUserId || !originDomainId || !role || !invitedByUserId) {
    return null;
  }

  const purpose =
    arrival.introductionPurpose === INTRODUCTION_PURPOSE_LEAD_DIRECTION
      ? INTRODUCTION_PURPOSE_LEAD_DIRECTION
      : INTRODUCTION_PURPOSE_LEAD_DIRECTION;

  const seed = normalizeInvitationSeed(arrival.seed);

  return {
    kind: 'invitation-arrival',
    invitationId,
    inviteeUserId,
    inviteeHomeDomainId: asTrimmedString(arrival.inviteeHomeDomainId),
    originDomainId,
    role,
    invitedByUserId,
    introductionPurpose: purpose,
    seed: invitationSeedHasContent(seed) ? seed : null,
  };
}

export function mergeDialogContext(
  existing: unknown,
  patch: Partial<DialogContextShape>,
): DialogContextShape {
  const root = asRecord(existing);
  const board =
    (typeof patch.board === 'string' ? patch.board : null) ??
    asTrimmedString(root?.board) ??
    '';
  const frame =
    (typeof patch.frame === 'string' ? patch.frame : null) ??
    asTrimmedString(root?.frame) ??
    '';
  const subject =
    (typeof patch.subject === 'string' ? patch.subject : null) ??
    asTrimmedString(root?.subject) ??
    '';
  const arrival =
    patch.arrival ?? parseDialogArrivalContext(existing) ?? undefined;
  const merged: DialogContextShape = { board, frame, subject };
  if (arrival) merged.arrival = arrival;
  return merged;
}

export function buildInvitationArrivalSnapshot(input: {
  invitationId: string;
  inviteeUserId: string;
  inviteeHomeDomainId: string | null;
  originDomainId: string;
  role: string;
  invitedByUserId: string;
  seed: unknown;
}): DialogArrivalContext {
  const seed = normalizeInvitationSeed(input.seed);
  return {
    kind: 'invitation-arrival',
    invitationId: input.invitationId.trim(),
    inviteeUserId: input.inviteeUserId.trim(),
    inviteeHomeDomainId: input.inviteeHomeDomainId?.trim() || null,
    originDomainId: input.originDomainId.trim(),
    role: input.role.trim() || 'user',
    invitedByUserId: input.invitedByUserId.trim(),
    introductionPurpose: INTRODUCTION_PURPOSE_LEAD_DIRECTION,
    seed: invitationSeedHasContent(seed) ? seed : null,
  };
}

export function formatDialogArrivalForAgent(arrival: DialogArrivalContext): string {
  const lines = [
    'First Introduction — you host this arrival.',
    'The following is inviter direction for you. It is not a message the person already sent. Use your Agency to greet them naturally.',
    `Invitee: ${arrival.inviteeUserId}`,
    `Role on this Domain: ${arrival.role}`,
    `Introduction purpose: ${arrival.introductionPurpose}`,
  ];
  if (arrival.inviteeHomeDomainId) {
    lines.push(`Invitee home Domain: ${arrival.inviteeHomeDomainId}`);
  }
  if (arrival.seed) {
    lines.push(
      formatInvitationSeedForAgent({
        email: arrival.inviteeUserId,
        role: arrival.role,
        status: 'member',
        seed: arrival.seed,
      }),
    );
  }
  return lines.join('\n');
}
