import type {
  DomainFrameJson,
  DomainFrameTreatment,
  DomainFrameTheme,
} from "../data/domain-frame.types"
import { DEFAULT_DOMAIN_FRAME } from "../data/domain-frame.default"

export type ResolvedDomainTreatment = DomainFrameTreatment

const HEX_WITH_HASH = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const HEX_WITHOUT_HASH = /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Normalize user-entered hex — accepts optional `#` prefix. */
export function normalizeTreatmentHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  if (!trimmed) return fallback

  let hex = trimmed
  if (HEX_WITHOUT_HASH.test(trimmed)) {
    hex = `#${trimmed}`
  }
  if (!HEX_WITH_HASH.test(hex)) return fallback

  if (hex.length === 4) {
    const [, r, g, b] = hex
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return hex.toLowerCase()
}

function normalizeHexColor(value: unknown, fallback: string): string {
  return normalizeTreatmentHexColor(value, fallback)
}

function normalizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallback
}

function treatmentFromTheme(theme: DomainFrameTheme | undefined): DomainFrameTreatment {
  const colors = theme?.colors
  const fonts = theme?.fonts
  return {
    name: "Standard",
    palette: {
      background: colors?.surface?.trim() || DEFAULT_DOMAIN_FRAME.treatment!.palette.background,
      accent: colors?.accent?.trim() || colors?.primary?.trim() || DEFAULT_DOMAIN_FRAME.treatment!.palette.accent,
    },
    font: {
      family: fonts?.display?.trim() || fonts?.ui?.trim() || DEFAULT_DOMAIN_FRAME.treatment!.font.family,
    },
  }
}

function normalizeTreatment(
  raw: unknown,
  theme: DomainFrameTheme | undefined,
): ResolvedDomainTreatment {
  const fallback = DEFAULT_DOMAIN_FRAME.treatment ?? treatmentFromTheme(theme)
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return theme ? treatmentFromTheme(theme) : fallback
  }

  const input = raw as Record<string, unknown>
  const palette =
    input.palette && typeof input.palette === "object" && !Array.isArray(input.palette)
      ? (input.palette as Record<string, unknown>)
      : {}
  const font =
    input.font && typeof input.font === "object" && !Array.isArray(input.font)
      ? (input.font as Record<string, unknown>)
      : {}

  return {
    name: normalizeName(input.name, fallback.name),
    palette: {
      background: normalizeHexColor(palette.background, fallback.palette.background),
      accent: normalizeHexColor(palette.accent, fallback.palette.accent),
    },
    font: {
      family: normalizeFontFamily(font.family, fallback.font.family),
    },
  }
}

/** Resolve Chronicle Treatment from domain frame JSON with safe defaults. */
export function resolveDomainTreatment(
  domainFrame: DomainFrameJson | null | undefined,
): ResolvedDomainTreatment {
  if (!domainFrame) {
    return DEFAULT_DOMAIN_FRAME.treatment ?? treatmentFromTheme(undefined)
  }
  if (domainFrame.treatment) {
    return normalizeTreatment(domainFrame.treatment, domainFrame.theme)
  }
  return treatmentFromTheme(domainFrame.theme)
}
