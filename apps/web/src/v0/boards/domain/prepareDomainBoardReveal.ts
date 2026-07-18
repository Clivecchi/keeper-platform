/**
 * Board reveal readiness — shell + dialog session + lead Playbill agent + Nav lists.
 * Used by DomainShellGate and SceneChange so the curtain hides the full load.
 */

import { resolveDialogLeadSlug } from "../../lib/domainLeadAgent"
import { resolvePlaybillAgent } from "../../lib/playbillData"
import { peekDomainFrame } from "../../data/loadDomainFrame"
import {
  bootstrapDomainShell,
  DOMAIN_SHELL_MIN_HOLD_MS,
  isDomainShellReady,
  waitForDomainCoverDecode,
  type DomainShellReadyOptions,
} from "./domainShellBootstrap"
import { getCachedDomainBySlug, prefetchDomainShell } from "./domainShellCache"
import {
  peekPrefetchedDialogSession,
  prefetchDomainBoardDialogSession,
} from "./dialogSessionPrefetch"
import { isBoardNavWarm, prepareBoardNavData } from "../boardNavDataCache"
import { resolveRevealNavSections } from "./resolveRevealNavSections"

/** Hard ceiling so a hung network never traps users on the curtain forever. */
export const BOARD_REVEAL_HARD_TIMEOUT_MS = 12_000

export interface PrepareDomainBoardRevealResult {
  ready: boolean
  sessionId: string | null
  elapsedMs: number
  /** True when required Nav slices are cached after prepare (may be false on soft failure). */
  navWarm: boolean
}

/**
 * Warm everything the board needs before the curtain drops:
 * domain/frame/audience, cover decode, dialog session, lead agent portrait,
 * and board-required Nav slices (awaited — not fire-and-forget).
 */
export async function prepareDomainBoardReveal(
  slug: string,
  options?: DomainShellReadyOptions & { forceRefresh?: boolean; board?: string },
): Promise<PrepareDomainBoardRevealResult> {
  const startedAt = Date.now()
  const normalized = slug.trim()
  if (!normalized) {
    return { ready: false, sessionId: null, elapsedMs: 0, navWarm: false }
  }

  prefetchDomainShell(normalized)

  if (!isDomainShellReady(normalized, options)) {
    await bootstrapDomainShell(normalized, {
      requireAudience: options?.requireAudience,
      forceRefresh: options?.forceRefresh,
    })
  }

  if (!isDomainShellReady(normalized, options)) {
    return {
      ready: false,
      sessionId: null,
      elapsedMs: Date.now() - startedAt,
      navWarm: false,
    }
  }

  const domain = getCachedDomainBySlug(normalized)
  const board = options?.board ?? "domain"
  const leadSlug = domain ? resolveDialogLeadSlug(domain) : null
  const navSections = resolveRevealNavSections(normalized, board)

  const [sessionId] = await Promise.all([
    domain
      ? prefetchDomainBoardDialogSession({
          domain,
          domainSlug: normalized,
          board,
          dialogScope: "keeper",
        })
      : Promise.resolve(null),
    waitForDomainCoverDecode(normalized),
    leadSlug ? resolvePlaybillAgent(leadSlug).catch(() => null) : Promise.resolve(null),
    // Await Nav lists under the curtain so the board does not populate after reveal.
    domain?.id ? prepareBoardNavData(domain.id, navSections) : Promise.resolve(),
  ])

  // Session may still be settling via inflight — prefer peeked value.
  const peeked =
    domain?.id != null
      ? peekPrefetchedDialogSession(domain.id, board) ?? sessionId
      : sessionId

  // Dialog session required for board-ready. Nav was awaited above (soft — a failed
  // slice must not trap the curtain; travel/gate skip still checks isBoardNavWarm).
  const frameOk = !!peekDomainFrame(normalized)
  const ready =
    isDomainShellReady(normalized, options) &&
    frameOk &&
    !!peeked

  return {
    ready,
    sessionId: peeked,
    elapsedMs: Date.now() - startedAt,
    navWarm: !domain?.id || isBoardNavWarm(domain.id, navSections),
  }
}

/** Ensure minimum curtain hold after prepare settles. */
export async function holdCurtainMinimum(elapsedMs: number): Promise<void> {
  const remaining = Math.max(0, DOMAIN_SHELL_MIN_HOLD_MS - elapsedMs)
  if (remaining <= 0) return
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining)
  })
}
