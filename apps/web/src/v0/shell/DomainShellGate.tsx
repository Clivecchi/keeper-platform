"use client"

import * as React from "react"
import { useLocation } from "react-router-dom"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import { consumeTravelCurtainSkip } from "../boards/domain/domainShellBootstrap"
import {
  BOARD_REVEAL_HARD_TIMEOUT_MS,
  holdCurtainMinimum,
  prepareDomainBoardReveal,
} from "../boards/domain/prepareDomainBoardReveal"
import { isDomainShellReady } from "../boards/domain/domainShellBootstrap"
import { getCachedDomainBySlug } from "../boards/domain/domainShellCache"
import { isBoardNavWarm } from "../boards/boardNavDataCache"
import { resolveRevealNavSections } from "../boards/domain/resolveRevealNavSections"
import {
  resolveWorkspaceBoardId,
  type WorkspaceBoardId,
} from "../boards/workspaceBoardNav"

export interface DomainShellGateProps {
  domainSlug: string
  /** When true, audience must be cached before the board reveals. */
  requireAudience?: boolean
  children: React.ReactNode
}

type GatePhase = "curtain" | "ready" | "error"

function readActiveBoard(routerSearch: string): WorkspaceBoardId {
  return (
    resolveWorkspaceBoardId(
      routerSearch,
      typeof window !== "undefined" ? window.location.search : undefined,
    ) ?? "domain"
  )
}

/** Shell + Nav warm enough to reveal. Dialog session is optional (lazy on first send). */
function isBoardRevealReady(
  slug: string,
  requireAudience: boolean,
  board: WorkspaceBoardId,
): boolean {
  if (!isDomainShellReady(slug, { requireAudience })) return false
  const domain = getCachedDomainBySlug(slug)
  if (!domain?.id) return false
  return isBoardNavWarm(domain.id, resolveRevealNavSections(slug, board))
}

export function DomainShellGate({
  domainSlug,
  requireAudience = false,
  children,
}: DomainShellGateProps) {
  const slug = domainSlug.trim()
  const location = useLocation()

  const [phase, setPhase] = React.useState<GatePhase>(() => (slug ? "curtain" : "ready"))
  const [retryToken, setRetryToken] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) {
      setPhase("ready")
      setErrorMessage(null)
      return
    }

    // Warm the board in the URL (?board=ide|agent|domain|…) — not always "domain".
    // Board switches later do not re-run this gate (no curtain flash); conversation
    // resume stays board-scoped via useAgentDialog / resolve/active.
    const board = readActiveBoard(location.search)

    // Travel already prepared this slug — reveal immediately if board-ready.
    if (consumeTravelCurtainSkip(slug) && isBoardRevealReady(slug, requireAudience, board)) {
      setPhase("ready")
      setErrorMessage(null)
      return
    }

    let cancelled = false
    setPhase("curtain")
    setErrorMessage(null)

    void (async () => {
      const preparePromise = prepareDomainBoardReveal(slug, {
        requireAudience,
        forceRefresh: retryToken > 0,
        board,
      })

      const result = await Promise.race([
        preparePromise,
        new Promise<Awaited<typeof preparePromise>>((resolve) => {
          window.setTimeout(
            () =>
              resolve({
                ready: false,
                sessionId: null,
                elapsedMs: BOARD_REVEAL_HARD_TIMEOUT_MS,
                navWarm: false,
              }),
            BOARD_REVEAL_HARD_TIMEOUT_MS,
          )
        }),
      ])

      if (cancelled) return

      // Fail closed only when shell never became usable. Nav may soft-fail
      // after await — still reveal so one hung list cannot trap the curtain.
      // Missing dialog session is OK — first send creates it.
      if (!result.ready && !isBoardRevealReady(slug, requireAudience, board)) {
        setErrorMessage(
          "This domain could not be loaded. Check your connection and try again.",
        )
        setPhase("error")
        return
      }

      await holdCurtainMinimum(result.elapsedMs)
      if (cancelled) return

      setPhase("ready")
    })()

    return () => {
      cancelled = true
    }
    // location.search intentionally omitted — board switch must not re-curtain.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-load gate keyed by slug
  }, [slug, requireAudience, retryToken])

  if (!slug) {
    return <>{children}</>
  }

  if (phase === "ready") {
    return <>{children}</>
  }

  return (
    <DomainLoadCurtain
      domainSlug={slug}
      errorMessage={phase === "error" ? errorMessage : null}
      onRetry={
        phase === "error"
          ? () => {
              setRetryToken((n) => n + 1)
            }
          : undefined
      }
    />
  )
}
