"use client"

import * as React from "react"
import { DomainLoadCurtain } from "../sceneChange/DomainLoadCurtain"
import {
  bootstrapDomainShell,
  DOMAIN_SHELL_MIN_HOLD_MS,
  isDomainShellReady,
} from "../boards/domain/domainShellBootstrap"

export interface DomainShellGateProps {
  domainSlug: string
  /** When true, audience must be cached before the board reveals. */
  requireAudience?: boolean
  children: React.ReactNode
}

type GatePhase = "curtain" | "ready"

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

  React.useEffect(() => {
    if (!slug) {
      setPhase("ready")
      return
    }

    if (isDomainShellReady(slug, { requireAudience })) {
      setPhase("ready")
      return
    }

    let cancelled = false
    const mountedAt = Date.now()
    setPhase("curtain")

    void bootstrapDomainShell(slug, { requireAudience }).finally(() => {
      if (cancelled) return
      const elapsed = Date.now() - mountedAt
      const remaining = Math.max(0, DOMAIN_SHELL_MIN_HOLD_MS - elapsed)
      window.setTimeout(() => {
        if (!cancelled) setPhase("ready")
      }, remaining)
    })

    return () => {
      cancelled = true
    }
  }, [slug, requireAudience])

  if (phase === "curtain" && slug) {
    return <DomainLoadCurtain domainSlug={slug} />
  }

  return <>{children}</>
}
