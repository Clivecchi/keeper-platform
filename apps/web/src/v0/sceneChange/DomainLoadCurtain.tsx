"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  prefetchDomainShell,
  resolveDomainCoverUrl,
  resolveDomainShellDisplayName,
  getCachedDomainBySlug,
} from "../boards/domain/domainShellCache"
import { peekDomainFrame } from "../data/loadDomainFrame"
import { resolvePlaybillAgent } from "../lib/playbillData"
import { resolveDomainLeadContext, type DomainLeadRecord } from "../lib/domainLeadAgent"
import { DOMAIN_SHELL_MIN_HOLD_MS } from "../boards/domain/domainShellBootstrap"

export interface DomainLoadCurtainProps {
  domainSlug: string
  /** When set, curtain auto-dismisses after minimum hold (scene-change travel). */
  onComplete?: () => void
  /** Fail-closed boot gate — show retry instead of revealing a hollow board. */
  errorMessage?: string | null
  onRetry?: () => void
}

interface CurtainBilling {
  domainName: string
  agentName: string
  tagline: string
}

function resolveCurtainBilling(domainSlug: string): CurtainBilling {
  const cached = getCachedDomainBySlug(domainSlug)
  const frame = peekDomainFrame(domainSlug)
  const domainName = resolveDomainShellDisplayName(domainSlug)
  const tagline = frame?.theme?.tagline?.trim() || cached?.description?.trim() || ""
  const lead = resolveDomainLeadContext(cached as DomainLeadRecord | null)
  return {
    domainName,
    agentName: lead.name ?? "",
    tagline,
  }
}

function CurtainShimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[hsl(var(--theme-surface-panel)/0.35)] ${className}`}
      aria-hidden
    />
  )
}

export function DomainLoadCurtain({
  domainSlug,
  onComplete,
  errorMessage,
  onRetry,
}: DomainLoadCurtainProps) {
  const reducedMotion = useReducedMotion()
  const [billing, setBilling] = React.useState(() => resolveCurtainBilling(domainSlug))
  const [coverUrl, setCoverUrl] = React.useState(() => resolveDomainCoverUrl(domainSlug))
  const mountedAt = React.useRef(Date.now())
  const completedRef = React.useRef(false)

  React.useEffect(() => {
    let cancelled = false
    prefetchDomainShell(domainSlug)
    setBilling(resolveCurtainBilling(domainSlug))
    setCoverUrl(resolveDomainCoverUrl(domainSlug))

    const refreshVisuals = () => {
      if (cancelled) return
      setBilling(resolveCurtainBilling(domainSlug))
      setCoverUrl(resolveDomainCoverUrl(domainSlug))
    }

    // Prefetch is async — re-read cover/billing as shell cache fills.
    const timers = [120, 320, 640, 1200].map((ms) => window.setTimeout(refreshVisuals, ms))

    const cached = getCachedDomainBySlug(domainSlug)
    const leadSlug = resolveDomainLeadContext(cached as DomainLeadRecord | null).slug
    if (leadSlug) {
      void resolvePlaybillAgent(leadSlug).then((agent) => {
        if (!cancelled && agent?.displayName) {
          setBilling((prev) => ({ ...prev, agentName: agent.displayName }))
        }
      })
    }

    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [domainSlug])

  React.useEffect(() => {
    if (!onComplete || errorMessage) return

    const finish = () => {
      if (completedRef.current) return
      completedRef.current = true
      onComplete()
    }

    const elapsed = Date.now() - mountedAt.current
    const remaining = Math.max(0, DOMAIN_SHELL_MIN_HOLD_MS - elapsed)
    const timer = window.setTimeout(finish, remaining)
    return () => window.clearTimeout(timer)
  }, [domainSlug, onComplete, errorMessage])

  const hasDomainName = billing.domainName.length > 0
  const hasAgentName = billing.agentName.length > 0

  const content = (
    <motion.div
      className="domain-load-curtain fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background: coverUrl
          ? `linear-gradient(to bottom, hsl(var(--theme-surface-page) / 0.97), hsl(var(--theme-surface-page) / 0.99)), url(${coverUrl}) center/cover no-repeat`
          : "hsl(var(--theme-surface-page))",
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-label={hasDomainName ? `Loading ${billing.domainName}` : "Loading domain"}
    >
      <div className="mx-auto w-full max-w-md">
        {hasDomainName ? (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {billing.domainName} presents
          </p>
        ) : (
          <CurtainShimmer className="mx-auto h-3 w-36" />
        )}

        {hasAgentName ? (
          <p
            className="mt-3 font-serif text-2xl font-semibold"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {billing.agentName}
          </p>
        ) : (
          <CurtainShimmer className="mx-auto mt-4 h-8 w-48" />
        )}

        {billing.tagline ? (
          <p
            className="mt-2 text-sm italic leading-snug"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {billing.tagline}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="mt-8 space-y-3">
            <p
              className="text-sm leading-snug"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {errorMessage}
            </p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={{
                  background: "hsl(var(--theme-surface-panel))",
                  color: "hsl(var(--theme-ink-primary))",
                }}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  )

  if (typeof document === "undefined") return content
  return createPortal(content, document.body)
}
