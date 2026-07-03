import type { StyleId } from "../styles/styles"

export function buildPublicPresentUrl(options: {
  domainSlug: string
  journeyId: string
  theme?: string | null
  style?: StyleId | string | null
}): string {
  const params = new URLSearchParams()
  params.set("frame", "present")
  params.set("journeyId", options.journeyId)
  if (options.theme) params.set("theme", options.theme)
  if (options.style) params.set("style", String(options.style))
  return `/d/${encodeURIComponent(options.domainSlug)}?${params.toString()}`
}

export function buildPublicJourneysBrowseUrl(options: {
  domainSlug: string
  theme?: string | null
  style?: StyleId | string | null
}): string {
  const params = new URLSearchParams()
  params.set("frame", "journeys")
  if (options.theme) params.set("theme", options.theme)
  if (options.style) params.set("style", String(options.style))
  return `/d/${encodeURIComponent(options.domainSlug)}?${params.toString()}`
}

export function buildPublicCompanionUrl(options: {
  domainSlug: string
  frame?: string
  theme?: string | null
  style?: StyleId | string | null
  journeyId?: string | null
}): string {
  const params = new URLSearchParams()
  params.set("frame", options.frame ?? "cover")
  params.set("companion", "1")
  if (options.journeyId) params.set("journeyId", options.journeyId)
  if (options.theme) params.set("theme", options.theme)
  if (options.style) params.set("style", String(options.style))
  return `/d/${encodeURIComponent(options.domainSlug)}?${params.toString()}`
}
