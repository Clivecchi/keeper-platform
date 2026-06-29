import type { DomainFrameTheme } from '../data/domain-frame.types'

/** True when domain frame JSON defines at least one brand color (e.g. Ke3p). */
export function domainHasBrandColors(theme: DomainFrameTheme | undefined): boolean {
  if (!theme?.colors) return false
  const { primary, accent, surface } = theme.colors
  return Boolean(primary?.trim() || accent?.trim() || surface?.trim())
}
