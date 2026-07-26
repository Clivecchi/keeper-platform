/**
 * Declared Dialog-voice / participation on kip_agents.config.
 *
 * Additive to DialogCastMember enable/disable — membership ≠ voice mode.
 * - voice: may hold a first-person Dialog voice when cast-enabled / consulted
 * - support_only: platform/support contribution only — not a Dialog voice
 * - silent: present on roster but not consulted and not spoken for
 */

export const DIALOG_PARTICIPATION_VALUES = ['voice', 'support_only', 'silent'] as const;

export type DialogParticipation = (typeof DIALOG_PARTICIPATION_VALUES)[number];

export function isDialogParticipation(value: unknown): value is DialogParticipation {
  return (
    typeof value === 'string'
    && (DIALOG_PARTICIPATION_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Read participation from agent config.
 * Default is `voice` for every agent (including Cloud).
 * Prefer Agent Config `dialog_participation` when an agent should be support-only or silent.
 */
export function resolveDialogParticipation(
  config: unknown,
  _options?: { slug?: string | null },
): DialogParticipation {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    const raw = (config as Record<string, unknown>).dialog_participation;
    if (isDialogParticipation(raw)) return raw;
  }
  return 'voice';
}

export function dialogParticipationLabel(value: DialogParticipation): string {
  switch (value) {
    case 'support_only':
      return 'Support';
    case 'silent':
      return 'Silent';
    case 'voice':
    default:
      return 'Voice';
  }
}
