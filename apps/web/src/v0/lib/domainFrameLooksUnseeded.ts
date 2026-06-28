import type { DomainFrameJson } from "../data/domain-frame.types"

const PLATFORM_WORDMARKS = new Set(["ke3p", "keeper"])

/**
 * True when the loaded frame still reflects platform defaults — usually because
 * `domain.frame_json` is empty and GET /frame returned the API fallback.
 */
export function domainFrameLooksUnseeded(
  frame: DomainFrameJson,
  domainSlug: string,
  domainName?: string | null,
): boolean {
  if (domainSlug === "default") return false

  const wordmark = frame.theme?.wordmark?.trim()
  if (!wordmark) return true

  const normalized = wordmark.toLowerCase()
  if (PLATFORM_WORDMARKS.has(normalized)) return true

  const name = domainName?.trim()
  if (name && wordmark === name) return false

  return false
}
