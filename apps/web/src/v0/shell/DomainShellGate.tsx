"use client"

import * as React from "react"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import { consumeTravelCurtainSkip } from "../boards/domain/domainShellBootstrap"
import {
  BOARD_REVEAL_HARD_TIMEOUT_MS,
  holdCurtainMinimum,
  prepareDomainBoardReveal,
} from "../boards/domain/prepareDomainBoardReveal"
import { isDomainShellReady } from "../boards/domain/domainShellBootstrap"
import { peekPrefetchedDialogSession } from "../boards/domain/dialogSessionPrefetch"
import { getCachedDomainBySlug } from "../boards/domain/domainShellCache"

export interface DomainShellGateProps {
  domainSlug: string
  /** When true, audience must be cached before the board reveals. */
  requireAudience?: boolean
  children: React.ReactNode
}

type GatePhase = "curtain" | "ready" | "error"

function isBoardRevealReady(slug: string, requireAudience: boolean): boolean {
  if (!isDomainShellReady(slug, { requireAudience })) return false
  const domain = getCachedDomainBySlug(slug)
  if (!domain?.id) return false
  return !!peekPrefetchedDialogSession(domain.id, "domain")
}

export function DomainShellGate({
  domainSlug,
  requireAudience = false,
  children,
}: DomainShellGateProps) {
  const slug = domainSlug.trim()

  const [phase, setPhase] = React.useState<GatePhase>(() => (slug ? "curtain" : "ready"))
  const [retryToken, setRetryToken] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) {
      setPhase("ready")
      setErrorMessage(null)
      return
    }

    // Travel already prepared this slug — reveal immediately if board-ready.
    if (consumeTravelCurtainSkip(slug) && isBoardRevealReady(slug, requireAudience)) {
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
        board: "domain",
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
              }),
            BOARD_REVEAL_HARD_TIMEOUT_MS,
          )
        }),
      ])

      if (cancelled) return

      if (!result.ready && !isBoardRevealReady(slug, requireAudience)) {
        setErrorMessage(
          "This domain could not be loaded. Check your connection and try again.",
        )
        setPhase("error")
        return
      }

      await holdCurtainMinimum(result.elapsedMs)
      if (cancelled) return

      if (!isBoardRevealReady(slug, requireAudience) && !result.sessionId) {
        setErrorMessage(
          "Dialog could not be prepared. Check your connection and try again.",
        )
        setPhase("error")
        return
      }

      setPhase("ready")
    })()

    return () => {
      cancelled = true
    }
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
