"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { motion, useReducedMotion } from "framer-motion"
import { useTheme } from "../../context/ThemeContext"
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
import { PlaybillAgentPortrait, resolvePlaybillAmbientUrl } from "../components/playbillVisual"
import { resolveDomainThemeSync } from "../themes/domainThemeResolver"
import { registerRuntimeTheme } from "../themes/themeResolver"
import { DOMAIN_THEME_SLUG } from "../themes/constants"
import { tokensToCSSVars } from "../styles/styleRegistry"
import type { StyleTokens } from "../styles/styleRegistry"
import type { DomainFrameTheme } from "../data/domain-frame.types"
import { getBlobProxyUrl } from "../../lib/blobProxy"

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
    surface: "#fdfaf4",
  },
  fonts: { display: "", ui: "" },
}

function resolveCurtainTheme(
  domainSlug: string,
  colorScheme: "light" | "dark",
): { vars: React.CSSProperties; tokens: StyleTokens } {
  const frame = peekDomainFrame(domainSlug)
  const theme = (frame?.theme ?? FALLBACK_THEME) as DomainFrameTheme
  const tokens = resolveDomainThemeSync(theme, colorScheme) as unknown as StyleTokens
  return {
    tokens,
    vars: tokensToCSSVars(tokens) as React.CSSProperties,
  }
}

function resolveCurtainCoverUrl(domainSlug: string): string | null {
  const fromShell = resolveDomainCoverUrl(domainSlug)
  if (fromShell) return fromShell
  const frameBg = peekDomainFrame(domainSlug)?.theme?.background?.trim()
  if (frameBg && /^(https?:|blob:|data:|\/)/i.test(frameBg)) {
    return frameBg.includes("blob.vercel-storage.com") ? getBlobProxyUrl(frameBg) : frameBg
  }
  return null
}

/**
 * Member load curtain — same scale/layout language as public Cover
 * (full-bleed page + max-w-5xl centered identity), with lead-agent billing.
 */
export function DomainLoadCurtain({
  domainSlug,
  errorMessage,
  onRetry,
}: DomainLoadCurtainProps) {
  const reducedMotion = useReducedMotion()
  const { colorScheme } = useTheme()
  const [domainName, setDomainName] = React.useState(() =>
    resolveDomainShellDisplayName(domainSlug),
  )
  const [coverUrl, setCoverUrl] = React.useState(() => resolveCurtainCoverUrl(domainSlug))
  const [themeVars, setThemeVars] = React.useState(
    () => resolveCurtainTheme(domainSlug, colorScheme).vars,
  )
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
      setCoverUrl(resolveCurtainCoverUrl(domainSlug))
      const { vars, tokens } = resolveCurtainTheme(domainSlug, colorScheme)
      setThemeVars(vars)
      // Hand theme to StyleScope before board mounts — prevents post-curtain theme loss.
      registerRuntimeTheme(DOMAIN_THEME_SLUG, tokens as never)
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
  }, [domainSlug, colorScheme])

  const cached = getCachedDomainBySlug(domainSlug)
  const lead = resolveDomainLeadContext(cached as DomainLeadRecord | null)
  const frame = peekDomainFrame(domainSlug)
  const billingName = domainName.trim() || domainSlug
  const tagline =
    frame?.theme?.tagline?.trim() ||
    cached?.description?.trim() ||
    ""
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
  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"

  const pageBackground: React.CSSProperties = ambientUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${ambientUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }
    : { backgroundColor: "hsl(var(--theme-surface-page))" }

  const content = (
    <motion.div
      className="domain-load-curtain fixed inset-0 z-[200] min-h-screen"
      style={{
        ...themeVars,
        ...pageBackground,
        padding: "clamp(1.5rem, 5vw, 3.25rem)",
        color: "var(--theme-ink-primary)",
      }}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      role="status"
      aria-live="polite"
      aria-label={billingName ? `Loading ${billingName}` : "Loading domain"}
    >
      <div className="mx-auto flex min-h-[calc(100vh-clamp(3rem,10vw,6.5rem))] w-full max-w-5xl flex-col items-center justify-center">
        <section
          aria-label="Domain load identity"
          className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4 text-center"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.28em]"
            style={{ color: "var(--theme-ink-tertiary, hsl(var(--theme-ink-secondary)))" }}
          >
            {billingName} presents
          </p>

          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            portraitEmoji={portraitEmoji}
            fallback={portraitFallback}
            accent={accent}
            size="hero"
          />

          <h2
            className="font-serif text-3xl tracking-wide md:text-4xl"
            style={{ color: "var(--theme-ink-primary)" }}
          >
            {starName}
          </h2>

          <p
            className="text-[11px] font-mono uppercase tracking-[0.14em]"
            style={{ color: accent }}
          >
            {roleSubtitle}
          </p>

          {tagline ? (
            <p
              className="max-w-md text-sm leading-relaxed"
              style={{ color: "var(--theme-ink-secondary)" }}
            >
              {tagline}
            </p>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 max-w-md space-y-3">
              <p className="text-sm leading-snug" style={{ color: "var(--theme-ink-secondary)" }}>
                {errorMessage}
              </p>
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full border px-5 py-2 text-[11px] font-medium uppercase tracking-[0.12em] transition-opacity hover:opacity-90"
                  style={{
                    borderColor: "var(--theme-border-soft)",
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
                    color: "var(--theme-ink-primary)",
                  }}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : (
            <p
              className="mt-2 text-[11px] tracking-wide"
              style={{ color: "var(--theme-ink-tertiary, var(--theme-ink-secondary))" }}
            >
              Preparing board…
            </p>
          )}
        </section>
      </div>
    </motion.div>
  )

  if (typeof document === "undefined") return content
  return createPortal(content, document.body)
}
