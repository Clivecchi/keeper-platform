"use client"

import * as React from "react"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import {
  bootstrapDomainShell,
  consumeTravelCurtainSkip,
  DOMAIN_SHELL_MIN_HOLD_MS,
  isDomainShellReady,
  waitForDomainCoverDecode,
} from "../boards/domain/domainShellBootstrap"
import { getCachedDomainBySlug } from "../boards/domain/domainShellCache"
import { prefetchDomainBoardDialogSession } from "../boards/domain/dialogSessionPrefetch"

export interface DomainShellGateProps {
  domainSlug: string
  /** When true, audience must be cached before the board reveals. */
  requireAudience?: boolean
  children: React.ReactNode
}

type GatePhase = "curtain" | "ready" | "error"

export function DomainShellGate({
  domainSlug,
  requireAudience = false,
  children,
}: DomainShellGateProps) {
  const slug = domainSlug.trim()

  // Always start on curtain for branded first paint (login + cold load).
  // Travel paths call markTravelCurtainShown; the effect below may skip a double curtain.
  const [phase, setPhase] = React.useState<GatePhase>(() => (slug ? "curtain" : "ready"))
  const [retryToken, setRetryToken] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) {
      setPhase("ready")
      setErrorMessage(null)
      return
    }

    if (consumeTravelCurtainSkip(slug) && isDomainShellReady(slug, { requireAudience })) {
      setPhase("ready")
      setErrorMessage(null)
      const domain = getCachedDomainBySlug(slug)
      if (domain) {
        void prefetchDomainBoardDialogSession({
          domain,
          domainSlug: slug,
          dialogScope: "keeper",
        })
      }
      return
    }

    let cancelled = false
    const mountedAt = Date.now()
    setPhase("curtain")
    setErrorMessage(null)

    void (async () => {
      const alreadyReady = isDomainShellReady(slug, { requireAudience })
      if (!alreadyReady) {
        const result = await bootstrapDomainShell(slug, {
          requireAudience,
          forceRefresh: retryToken > 0,
        }).catch(() => null)

        if (cancelled) return

        const ready =
          result?.ready === true || isDomainShellReady(slug, { requireAudience })

        if (!ready) {
          setErrorMessage(
            "This domain could not be loaded. Check your connection and try again.",
          )
          setPhase("error")
          return
        }
      }

      const domain = getCachedDomainBySlug(slug)
      await Promise.all([
        waitForDomainCoverDecode(slug),
        domain
          ? prefetchDomainBoardDialogSession({
              domain,
              domainSlug: slug,
              dialogScope: "keeper",
            })
          : Promise.resolve(null),
      ])

      if (cancelled) return

      const elapsed = Date.now() - mountedAt
      const remaining = Math.max(0, DOMAIN_SHELL_MIN_HOLD_MS - elapsed)
      window.setTimeout(() => {
        if (cancelled) return
        if (!isDomainShellReady(slug, { requireAudience })) {
          setErrorMessage(
            "This domain could not be loaded. Check your connection and try again.",
          )
          setPhase("error")
          return
        }
        setPhase("ready")
      }, remaining)
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
