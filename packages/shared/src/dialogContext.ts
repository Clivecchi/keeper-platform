import {
  formatInvitationSeedForAgent,
  invitationSeedHasContent,
  normalizeInvitationSeed,
  type InvitationSeed,
} from './invitationSeed.js';

/** Seed is inviter direction for the origin Lead — not a Dialog message. */
export const INTRODUCTION_PURPOSE_LEAD_DIRECTION = 'lead-direction' as const;

export type IntroductionPurpose = typeof INTRODUCTION_PURPOSE_LEAD_DIRECTION;

export type InvitationArrivalDoor = {
  domainId: string;
  domainSlug: string;
  domainName: string;
  role: string;
};

export type InvitationArrivalDialogDoor = {
  dialogId: string;
  title: string;
  domainId: string;
  domainSlug: string;
  domainName: string;
};

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
  /** Display name of the person who sent the invitation. */
  inviterName?: string;
  originDomainName?: string;
  originLeadName?: string;
  /** Dialog on the inviting Domain where inviter and invitee share one conversation. */
  sharedDialogId?: string;
  /** True on the invitee's home Dialog, which lists doors into the owning Domains. */
  homeDirectory?: boolean;
  doors?: InvitationArrivalDoor[];
  assignedDialogs?: InvitationArrivalDialogDoor[];
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

function parseDoors(value: unknown): InvitationArrivalDoor[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const doors: InvitationArrivalDoor[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;
    const domainId = asTrimmedString(row.domainId);
    const domainSlug = asTrimmedString(row.domainSlug);
    const domainName = asTrimmedString(row.domainName);
    const role = asTrimmedString(row.role) ?? 'user';
    if (!domainId || !domainSlug || !domainName) continue;
    doors.push({ domainId, domainSlug, domainName, role });
  }
  return doors.length > 0 ? doors : undefined;
}

function parseAssignedDialogs(value: unknown): InvitationArrivalDialogDoor[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const doors: InvitationArrivalDialogDoor[] = [];
  for (const entry of value) {
    const row = asRecord(entry);
    if (!row) continue;
    const dialogId = asTrimmedString(row.dialogId);
    const title = asTrimmedString(row.title);
    const domainId = asTrimmedString(row.domainId);
    const domainSlug = asTrimmedString(row.domainSlug);
    const domainName = asTrimmedString(row.domainName);
    if (!dialogId || !title || !domainId || !domainSlug || !domainName) continue;
    doors.push({ dialogId, title, domainId, domainSlug, domainName });
  }
  return doors.length > 0 ? doors : undefined;
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

  const doors = parseDoors(arrival.doors);
  const assignedDialogs = parseAssignedDialogs(arrival.assignedDialogs);
  const inviterName = asTrimmedString(arrival.inviterName);
  const originDomainName = asTrimmedString(arrival.originDomainName);
  const originLeadName = asTrimmedString(arrival.originLeadName);
  const sharedDialogId = asTrimmedString(arrival.sharedDialogId);

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
    ...(inviterName ? { inviterName } : {}),
    ...(originDomainName ? { originDomainName } : {}),
    ...(originLeadName ? { originLeadName } : {}),
    ...(sharedDialogId ? { sharedDialogId } : {}),
    ...(arrival.homeDirectory === true ? { homeDirectory: true } : {}),
    ...(doors ? { doors } : {}),
    ...(assignedDialogs ? { assignedDialogs } : {}),
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
  inviterName?: string | null;
  originDomainName?: string | null;
  originLeadName?: string | null;
  sharedDialogId?: string | null;
  homeDirectory?: boolean;
  doors?: InvitationArrivalDoor[];
  assignedDialogs?: InvitationArrivalDialogDoor[];
}): DialogArrivalContext {
  const seed = normalizeInvitationSeed(input.seed);
  const doors = parseDoors(input.doors);
  const assignedDialogs = parseAssignedDialogs(input.assignedDialogs);
  const inviterName = input.inviterName?.trim() || null;
  const originDomainName = input.originDomainName?.trim() || null;
  const originLeadName = input.originLeadName?.trim() || null;
  const sharedDialogId = input.sharedDialogId?.trim() || null;
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
    ...(inviterName ? { inviterName } : {}),
    ...(originDomainName ? { originDomainName } : {}),
    ...(originLeadName ? { originLeadName } : {}),
    ...(sharedDialogId ? { sharedDialogId } : {}),
    ...(input.homeDirectory ? { homeDirectory: true } : {}),
    ...(doors ? { doors } : {}),
    ...(assignedDialogs ? { assignedDialogs } : {}),
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
  if (arrival.inviterName) {
    lines.push(`Inviter: ${arrival.inviterName} is in this Dialog with the invitee.`);
  }
  if (arrival.doors?.length) {
    lines.push(
      `Doors: ${arrival.doors.map((door) => `${door.domainName} (${door.domainSlug})`).join(', ')}`,
    );
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
