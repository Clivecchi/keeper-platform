import { DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES } from "@keeper/shared"

/** Default MCP scopes for a newly minted Domain Access Key. */
export const DEFAULT_NEW_ACCESS_KEY_SCOPES = DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES

export function formatScopeList(scopes: string[]): string {
  if (!scopes.length) return "No scopes"
  return scopes
    .map((scope) => {
      if (scope === "library.ro") return "Library read"
      if (scope === "library.rw") return "Library read/write"
      if (scope === "dialog.ro") return "Dialog read"
      if (scope === "dialog.rw") return "Bring in writing"
      if (scope === "gloss.rw") return "Gloss write"
      return scope
    })
    .join(", ")
}

/** Library + Dialog read/write + Gloss — Document → Gloss / bring-in chain. */
export function withDialogAndGlossScopes(scopes: string[]): string[] {
  const next = new Set(scopes)
  if (!next.has("library.rw")) next.add("library.ro")
  next.add("dialog.ro")
  next.add("dialog.rw")
  next.add("gloss.rw")
  return [...next]
}
