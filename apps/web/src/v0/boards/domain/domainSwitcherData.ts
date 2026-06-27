import { apiFetch } from "../../../lib/apiFetch"
import { getAuthToken } from "../../../lib/authTokenStore"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

export interface DomainSwitcherEntry {
  slug: string
  name: string
  tagline: string
  coverImageUrl?: string | null
}

interface ApiDomainRow {
  slug: string
  name: string
  description?: string | null
  customDomain?: string | null
  theme?: unknown
  isActive?: boolean
  deletedAt?: string | null
}

function parseTheme(theme: unknown): { coverImage?: string; tagline?: string } {
  if (!theme || typeof theme !== "object") return {}
  const record = theme as Record<string, unknown>
  return {
    coverImage: typeof record.coverImage === "string" ? record.coverImage : undefined,
    tagline: typeof record.tagline === "string" ? record.tagline : undefined,
  }
}

export function mapApiDomainToSwitcherEntry(domain: ApiDomainRow): DomainSwitcherEntry {
  const theme = parseTheme(domain.theme)
  const rawCover = theme.coverImage ?? null

  return {
    slug: domain.slug,
    name: domain.name,
    tagline:
      domain.description?.trim() ||
      theme.tagline?.trim() ||
      domain.customDomain?.trim() ||
      domain.slug,
    coverImageUrl: rawCover ? getBlobProxyUrl(rawCover) : null,
  }
}

function isVisibleUserDomain(domain: ApiDomainRow): boolean {
  if (domain.deletedAt) return false
  if (domain.isActive === false) return false
  return Boolean(domain.slug?.trim() && domain.name?.trim())
}

async function fetchUserDomainsList(): Promise<ApiDomainRow[]> {
  const path = "/api/domains/my"
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  // Vite dev server proxies /api to localhost:3002. apiFetch targets production when
  // VITE_API_URL is unset on localhost, so use same-origin fetch here in dev only.
  if (isLocalDev) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(path, { credentials: "include", headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || "Request failed"}`)
    }
    const data = (await response.json()) as ApiDomainRow[] | { error?: string }
    return Array.isArray(data) ? data : []
  }

  const data = (await apiFetch(path)) as ApiDomainRow[] | { error?: string }
  return Array.isArray(data) ? data : []
}

export async function fetchDomainSwitcherEntries(): Promise<DomainSwitcherEntry[]> {
  const rows = await fetchUserDomainsList()

  return rows.filter(isVisibleUserDomain).map(mapApiDomainToSwitcherEntry)
}
