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

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Build a treatment object from loosely-shaped color/font fields. */
function treatmentFromLooseFields(source: Record<string, unknown>): Record<string, unknown> | null {
  const name = readString(source.name) ?? readString(source.label) ?? readString(source.title);
  const background =
    readString(source.background)
    ?? readString(source.backgroundColor)
    ?? readString(source.bg);
  const accent =
    readString(source.accent)
    ?? readString(source.accentColor)
    ?? readString(source.border);
  const fontFamily =
    readString(source.fontFamily)
    ?? (typeof source.font === 'string' ? readString(source.font) : undefined)
    ?? (isRecord(source.font) ? readString(source.font.family) : undefined);

  const paletteFromObject = isRecord(source.palette) ? source.palette : null;
  const fontFromObject = isRecord(source.font) ? source.font : null;

  const palette: Record<string, unknown> = {};
  if (paletteFromObject) {
    Object.assign(palette, paletteFromObject);
  }
  if (background) palette.background = background;
  if (accent) palette.accent = accent;

  const font: Record<string, unknown> = {};
  if (fontFromObject) {
    Object.assign(font, fontFromObject);
  }
  if (fontFamily) font.family = fontFamily;

  const hasPalette = Object.keys(palette).length > 0;
  const hasFont = Object.keys(font).length > 0;
  if (!name && !hasPalette && !hasFont) return null;

  const treatment: Record<string, unknown> = {};
  if (name) treatment.name = name;
  if (hasPalette) treatment.palette = palette;
  if (hasFont) treatment.font = font;
  return treatment;
}

/**
 * Coerce common model payload mistakes for treatment.propose.
 * Models often emit flat { name, palette, font } instead of { treatment: {...} },
 * or nest under proposal / values / theme — or put hex colors at the top level.
 */
export function coerceTreatmentProposePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };

  // treatment sent as JSON string
  if (typeof out.treatment === 'string' && out.treatment.trim()) {
    try {
      const parsed = JSON.parse(out.treatment) as unknown;
      if (isRecord(parsed)) {
        out.treatment = isRecord(parsed.treatment) ? parsed.treatment : parsed;
      }
    } catch {
      /* keep string; executor will fail clearly */
    }
  }

  if (isRecord(out.treatment)) {
    const enriched = treatmentFromLooseFields(out.treatment);
    if (enriched) out.treatment = { ...out.treatment, ...enriched };
    return out;
  }

  const nestedCandidates = [
    out.proposal,
    out.values,
    out.treatmentProposal,
    out.patch,
    out.theme,
    out.look,
    out.spec,
    out.config,
    out.data,
  ];
  for (const candidate of nestedCandidates) {
    if (!isRecord(candidate)) continue;
    if (isRecord(candidate.treatment)) {
      out.treatment = candidate.treatment;
      if (typeof out.rationale !== 'string' && typeof candidate.rationale === 'string') {
        out.rationale = candidate.rationale;
      }
      return out;
    }
    const fromCandidate = treatmentFromLooseFields(candidate);
    if (fromCandidate) {
      out.treatment = fromCandidate;
      if (typeof out.rationale !== 'string' && typeof candidate.rationale === 'string') {
        out.rationale = candidate.rationale;
      }
      return out;
    }
  }

  // Flat payload: treatment fields (including bare background/accent/fontFamily) at top level.
  const fromFlat = treatmentFromLooseFields(out);
  if (fromFlat) {
    out.treatment = fromFlat;
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
