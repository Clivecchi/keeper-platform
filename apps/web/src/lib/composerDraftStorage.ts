/**
 * Composer draft persistence — sessionStorage-backed unsent message recovery.
 * Survives refresh, board remount, and transient React crashes within the tab.
 */

export const COMPOSER_DRAFT_STORAGE_VERSION = 1 as const

const STORAGE_PREFIX = `keeper.composerDraft.v${COMPOSER_DRAFT_STORAGE_VERSION}`

/** Maximum characters stored per draft (sessionStorage safety). */
export const COMPOSER_DRAFT_MAX_LENGTH = 50_000

export interface ComposerDraftScope {
  domainSlug: string
  /** Board / surface id — e.g. domain, ide, agent, companion, cover. */
  board: string
  /** Resolved agent id or slug when id is not yet available. */
  agentId: string
  /** Active dialog session; null uses a pending bucket until session resolves. */
  sessionId: string | null
}

export function buildComposerDraftKey(scope: ComposerDraftScope): string {
  const slugPart = scope.domainSlug.trim() || "default"
  const boardPart = scope.board.trim() || "conversation"
  const agentPart = scope.agentId.trim() || "default"
  const sessionPart = scope.sessionId?.trim() || "pending"
  return `${STORAGE_PREFIX}:${slugPart}:${boardPart}:${agentPart}:${sessionPart}`
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

export function readComposerDraft(key: string): string | null {
  if (!canUseSessionStorage()) return null
  try {
    const raw = window.sessionStorage.getItem(key)
    if (raw == null || raw === "") return null
    return raw.length > COMPOSER_DRAFT_MAX_LENGTH
      ? raw.slice(0, COMPOSER_DRAFT_MAX_LENGTH)
      : raw
  } catch {
    return null
  }
}

export function writeComposerDraft(key: string, text: string): void {
  if (!canUseSessionStorage()) return
  try {
    const trimmed = text.trim()
    if (!trimmed) {
      window.sessionStorage.removeItem(key)
      return
    }
    const bounded =
      trimmed.length > COMPOSER_DRAFT_MAX_LENGTH
        ? trimmed.slice(0, COMPOSER_DRAFT_MAX_LENGTH)
        : trimmed
    window.sessionStorage.setItem(key, bounded)
  } catch {
    /* quota / private mode — best-effort only */
  }
}

export function clearComposerDraft(key: string): void {
  if (!canUseSessionStorage()) return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Move a pending-session draft onto a resolved session key. */
export function migrateComposerDraft(
  fromScope: ComposerDraftScope,
  toScope: ComposerDraftScope,
): void {
  const fromKey = buildComposerDraftKey(fromScope)
  const toKey = buildComposerDraftKey(toScope)
  if (fromKey === toKey) return

  const existing = readComposerDraft(toKey)
  if (existing?.trim()) return

  const pending = readComposerDraft(fromKey)
  if (!pending?.trim()) return

  writeComposerDraft(toKey, pending)
  clearComposerDraft(fromKey)
}
