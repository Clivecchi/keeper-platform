/**
 * Normalize Treatment v0 proposals for treatment.propose action results.
 */

const HEX_WITH_HASH = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_WITHOUT_HASH = /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_TREATMENT = {
  name: 'Standard',
  palette: { background: '#f5f0e8', accent: '#2d6a7f' },
  font: { family: 'Georgia, serif' },
} as const;

export type NormalizedDomainTreatment = {
  name: string;
  palette: { background: string; accent: string };
  font: { family: string };
};

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  let hex = trimmed;
  if (HEX_WITHOUT_HASH.test(trimmed)) {
    hex = `#${trimmed}`;
  }
  if (!HEX_WITH_HASH.test(hex)) return fallback;

  if (hex.length === 4) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function readExistingTreatment(raw: unknown): NormalizedDomainTreatment {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_TREATMENT, palette: { ...DEFAULT_TREATMENT.palette }, font: { ...DEFAULT_TREATMENT.font } };
  }
  const input = raw as Record<string, unknown>;
  const palette =
    input.palette && typeof input.palette === 'object' && !Array.isArray(input.palette)
      ? (input.palette as Record<string, unknown>)
      : {};
  const font =
    input.font && typeof input.font === 'object' && !Array.isArray(input.font)
      ? (input.font as Record<string, unknown>)
      : {};

  return {
    name: normalizeName(input.name, DEFAULT_TREATMENT.name),
    palette: {
      background: normalizeHexColor(palette.background, DEFAULT_TREATMENT.palette.background),
      accent: normalizeHexColor(palette.accent, DEFAULT_TREATMENT.palette.accent),
    },
    font: {
      family: normalizeFontFamily(font.family, DEFAULT_TREATMENT.font.family),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Coerce common model payload mistakes for treatment.propose.
 * Models often emit flat { name, palette, font } instead of { treatment: {...} },
 * or nest under proposal / values.
 */
export function coerceTreatmentProposePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };

  if (isRecord(out.treatment)) {
    return out;
  }

  const nestedCandidates = [out.proposal, out.values, out.treatmentProposal, out.patch];
  for (const candidate of nestedCandidates) {
    if (!isRecord(candidate)) continue;
    if (isRecord(candidate.treatment)) {
      out.treatment = candidate.treatment;
      if (typeof out.rationale !== 'string' && typeof candidate.rationale === 'string') {
        out.rationale = candidate.rationale;
      }
      return out;
    }
    if (
      typeof candidate.name === 'string'
      || isRecord(candidate.palette)
      || isRecord(candidate.font)
    ) {
      out.treatment = candidate;
      if (typeof out.rationale !== 'string' && typeof candidate.rationale === 'string') {
        out.rationale = candidate.rationale;
      }
      return out;
    }
  }

  // Flat payload: treatment fields at top level.
  if (
    typeof out.name === 'string'
    || isRecord(out.palette)
    || isRecord(out.font)
  ) {
    const treatment: Record<string, unknown> = {};
    if (typeof out.name === 'string') treatment.name = out.name;
    if (isRecord(out.palette)) treatment.palette = out.palette;
    if (isRecord(out.font)) treatment.font = out.font;
    out.treatment = treatment;
  }

  return out;
}

/** Merge a partial proposal onto existing Treatment and normalize all fields. */
export function normalizeTreatmentProposal(
  existing: unknown,
  proposal: Record<string, unknown>,
): NormalizedDomainTreatment {
  const base = readExistingTreatment(existing);
  const palette =
    proposal.palette && typeof proposal.palette === 'object' && !Array.isArray(proposal.palette)
      ? (proposal.palette as Record<string, unknown>)
      : {};
  const font =
    proposal.font && typeof proposal.font === 'object' && !Array.isArray(proposal.font)
      ? (proposal.font as Record<string, unknown>)
      : {};

  return {
    name: normalizeName(proposal.name ?? base.name, base.name),
    palette: {
      background: normalizeHexColor(palette.background ?? base.palette.background, base.palette.background),
      accent: normalizeHexColor(palette.accent ?? base.palette.accent, base.palette.accent),
    },
    font: {
      family: normalizeFontFamily(font.family ?? base.font.family, base.font.family),
    },
  };
}

export function buildTreatmentProposalSummary(treatment: NormalizedDomainTreatment): string {
  return `${treatment.name} — background ${treatment.palette.background}, accent ${treatment.palette.accent}, font ${treatment.font.family}`;
}
