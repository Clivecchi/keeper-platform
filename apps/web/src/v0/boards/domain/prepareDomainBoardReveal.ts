/**
 * Board reveal readiness — shell + dialog session + lead Playbill agent.
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
import { prefetchBoardNavData } from "../boardNavDataCache"

/** Hard ceiling so a hung network never traps users on the curtain forever. */
export const BOARD_REVEAL_HARD_TIMEOUT_MS = 12_000

export interface PrepareDomainBoardRevealResult {
  ready: boolean
  sessionId: string | null
  elapsedMs: number
}

/**
 * Warm everything the board needs before the curtain drops:
 * domain/frame/audience, cover decode, dialog session, lead agent portrait.
 */
export async function prepareDomainBoardReveal(
  slug: string,
  options?: DomainShellReadyOptions & { forceRefresh?: boolean; board?: string },
): Promise<PrepareDomainBoardRevealResult> {
  const startedAt = Date.now()
  const normalized = slug.trim()
  if (!normalized) {
    return { ready: false, sessionId: null, elapsedMs: 0 }
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
    }
  }

  const domain = getCachedDomainBySlug(normalized)
  const board = options?.board ?? "domain"
  const leadSlug = domain ? resolveDialogLeadSlug(domain) : null

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
  ])

  // Warm Nav lists under the curtain so the board does not populate after reveal.
  if (domain?.id) prefetchBoardNavData(domain.id)

  // Session may still be settling via inflight — prefer peeked value.
  const peeked =
    domain?.id != null
      ? peekPrefetchedDialogSession(domain.id, board) ?? sessionId
      : sessionId

  // Dialog session is required for board-ready. Frame peek is a soft confirm.
  const frameOk = !!peekDomainFrame(normalized)
  const ready =
    isDomainShellReady(normalized, options) &&
    frameOk &&
    !!peeked

  return {
    ready,
    sessionId: peeked,
    elapsedMs: Date.now() - startedAt,
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
