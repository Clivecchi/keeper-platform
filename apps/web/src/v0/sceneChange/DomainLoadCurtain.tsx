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
import {
  formatPlaybillRoleSubtitle,
  peekPlaybillAgent,
  resolvePlaybillAgent,
  resolvePlaybillStarName,
  type ResolvedPlaybillAgent,
} from "../lib/playbillData"
import { resolveDomainLeadContext, type DomainLeadRecord } from "../lib/domainLeadAgent"
import {
  PlaybillAgentPortrait,
  PlaybillAmbientLayer,
  resolvePlaybillAmbientUrl,
} from "../components/playbillVisual"
import { resolveDomainThemeSync } from "../themes/domainThemeResolver"
import { tokensToCSSVars } from "../styles/styleRegistry"
import type { StyleTokens } from "../styles/styleRegistry"
import type { DomainFrameTheme } from "../data/domain-frame.types"

export interface DomainLoadCurtainProps {
  domainSlug: string
  /** Fail-closed boot gate — show retry instead of revealing a hollow board. */
  errorMessage?: string | null
  onRetry?: () => void
}

const FALLBACK_THEME: DomainFrameTheme = {
  wordmark: "",
  tagline: "",
  background: "",
  colors: {
    primary: "#2d6a7f",
    accent: "#b8963e",
    surface: "#1a1d22",
  },
  fonts: { display: "", ui: "" },
}

function resolveCurtainThemeVars(domainSlug: string): React.CSSProperties {
  const frame = peekDomainFrame(domainSlug)
  const theme = (frame?.theme ?? FALLBACK_THEME) as DomainFrameTheme
  const tokens = resolveDomainThemeSync(theme, "dark")
  return tokensToCSSVars(tokens as unknown as StyleTokens) as React.CSSProperties
}

export function DomainLoadCurtain({
  domainSlug,
  errorMessage,
  onRetry,
}: DomainLoadCurtainProps) {
  const reducedMotion = useReducedMotion()
  const [domainName, setDomainName] = React.useState(() =>
    resolveDomainShellDisplayName(domainSlug),
  )
  const [coverUrl, setCoverUrl] = React.useState(() => resolveDomainCoverUrl(domainSlug))
  const [themeVars, setThemeVars] = React.useState(() => resolveCurtainThemeVars(domainSlug))
  const [agent, setAgent] = React.useState<ResolvedPlaybillAgent | null>(() => {
    const cached = getCachedDomainBySlug(domainSlug)
    const leadSlug = resolveDomainLeadContext(cached as DomainLeadRecord | null).slug
    return leadSlug ? peekPlaybillAgent(leadSlug) : null
  })

  React.useEffect(() => {
    let cancelled = false
    prefetchDomainShell(domainSlug)

    const refresh = () => {
      if (cancelled) return
      setDomainName(resolveDomainShellDisplayName(domainSlug))
      setCoverUrl(resolveDomainCoverUrl(domainSlug))
      setThemeVars(resolveCurtainThemeVars(domainSlug))
    }
    refresh()
    const timers = [80, 200, 400, 800, 1600].map((ms) => window.setTimeout(refresh, ms))

    const cached = getCachedDomainBySlug(domainSlug)
    const lead = resolveDomainLeadContext(cached as DomainLeadRecord | null)
    const leadSlug = lead.slug
    if (leadSlug) {
      const warm = peekPlaybillAgent(leadSlug)
      if (warm) setAgent(warm)
      void resolvePlaybillAgent(leadSlug).then((next) => {
        if (!cancelled && next) setAgent(next)
      })
    } else {
      setAgent(null)
    }

    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [domainSlug])

  const cached = getCachedDomainBySlug(domainSlug)
  const lead = resolveDomainLeadContext(cached as DomainLeadRecord | null)
  const billingName = domainName.trim() || domainSlug
  const isUncast = !lead.slug
  const starName = resolvePlaybillStarName({
    domainName: billingName,
    agentDisplayName: agent?.displayName ?? lead.name,
    isUncast,
    isLoading: !isUncast && !agent,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domainSlug, isUncast)
  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const portraitEmoji = isUncast ? null : agent?.avatarEmoji ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(coverUrl, portraitUrl)
  const portraitFallback = isUncast ? "A" : agent?.iconFallback ?? "?"
  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring, 168 45% 42%)))"

  const content = (
    <motion.div
      className="domain-load-curtain fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{
        ...themeVars,
        background: "hsl(var(--theme-surface-page, 220 16% 9%))",
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-label={billingName ? `Loading ${billingName}` : "Loading domain"}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl"
        style={{
          border: "1px solid hsl(var(--theme-border-soft, 220 12% 28%) / 0.55)",
          boxShadow: "0 24px 64px hsl(0 0% 0% / 0.45)",
          minHeight: 120,
        }}
      >
        <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

        <div className="relative z-10 flex items-center gap-4 px-5 py-5">
          <div className="min-w-0 flex-1 text-left">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em] truncate"
              style={{ color: "hsl(var(--theme-ink-secondary, 40 12% 72%))" }}
            >
              {billingName} presents
            </p>
            <p
              className="mt-1.5 font-serif text-2xl font-semibold leading-tight truncate"
              style={{ color: "hsl(var(--theme-ink-primary, 40 20% 96%))" }}
            >
              {starName}
            </p>
            <p
              className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] truncate"
              style={{ color: accent }}
            >
              {roleSubtitle}
            </p>
          </div>

          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            portraitEmoji={portraitEmoji}
            fallback={portraitFallback}
            accent={accent}
            size="header"
          />
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-6 max-w-md space-y-3 text-center">
          <p
            className="text-sm leading-snug"
            style={{ color: "hsl(var(--theme-ink-secondary, 40 12% 72%))" }}
          >
            {errorMessage}
          </p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md px-4 py-2 text-sm font-medium"
              style={{
                background: "hsl(var(--theme-surface-panel, 220 16% 14%))",
                color: "hsl(var(--theme-ink-primary, 40 20% 96%))",
                border: "1px solid hsl(var(--theme-border-soft, 220 12% 28%) / 0.55)",
              }}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <p
          className="mt-5 text-xs tracking-wide"
          style={{ color: "hsl(var(--theme-ink-tertiary, 40 10% 55%))" }}
        >
          Preparing board…
        </p>
      )}
    </motion.div>
  )

  if (typeof document === "undefined") return content
  return createPortal(content, document.body)
}
