"use client"

import * as React from "react"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import {
  bootstrapDomainShell,
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

  const [phase, setPhase] = React.useState<GatePhase>(() => {
    if (!slug) return "ready"
    return isDomainShellReady(slug, { requireAudience }) ? "ready" : "curtain"
  })
  const [retryToken, setRetryToken] = React.useState(0)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!slug) {
      setPhase("ready")
      setErrorMessage(null)
      return
    }

    if (isDomainShellReady(slug, { requireAudience })) {
      setPhase("ready")
      setErrorMessage(null)
      // Still warm the dialog session when cache already satisfied the gate.
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

      const domain = getCachedDomainBySlug(slug) ?? result?.domain ?? null
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
