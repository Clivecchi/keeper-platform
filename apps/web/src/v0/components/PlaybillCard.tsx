"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
} from "../boards/domain/domainSwitcherTheme"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { sealPlaybillGreet } from "../lib/playbillGreetContinuity"
import { PresenceField } from "../realm/PresenceField"

export interface PlaybillCardDomain {
  id: string
  slug: string
  name: string
  coverImageUrl?: string | null
  leadAgentSlug: string | null
}

export interface PlaybillCardProps {
  domain: PlaybillCardDomain
  isCurrent?: boolean
  onSelect: (slug: string) => void
  onClose?: () => void
  onPrefetch?: (slug: string) => void
  /** Desktop overlay uses compact ink tokens; mobile uses theme vars. */
  variant?: "overlay" | "realm"
  className?: string
}

const STAGE_HEIGHT = 148

function hashSlug(slug: string): number {
  let hash = 0
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function placeholderBackdrop(slug: string): string {
  const hash = hashSlug(slug)
  const hueA = 185 + (hash % 48)
  const hueB = (hueA + 28 + (hash % 16)) % 360
  return `linear-gradient(145deg, hsl(${hueA} 38% 24%) 0%, hsl(${hueB} 42% 14%) 52%, hsl(${hueA} 32% 9%) 100%)`
}

function PlaybillIconAvatar({
  fallback,
  accent,
}: {
  fallback: string
  accent: string
}) {
  return (
    <div
      className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center overflow-hidden rounded-2xl border"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.55)",
        background: "hsl(var(--theme-surface-elevated) / 0.88)",
        boxShadow: `0 0 24px ${accent}33`,
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <span
        className="relative font-serif text-2xl font-semibold select-none"
        style={{ color: accent }}
        aria-hidden
      >
        {fallback.length <= 2 ? fallback : fallback.slice(0, 2)}
      </span>
    </div>
  )
}

export function PlaybillCard({
  domain,
  isCurrent = false,
  onSelect,
  onClose,
  onPrefetch,
  variant = "overlay",
  className = "",
}: PlaybillCardProps) {
  const reducedMotion = useReducedMotion()
  const [isPressed, setIsPressed] = React.useState(false)
  const { isUncast, isLoading, agent, activityLine } = usePlaybillCard({
    domainId: domain.id,
    leadAgentSlug: domain.leadAgentSlug,
  })

  const inkPrimary =
    variant === "overlay" ? SWITCHER_INK_PRIMARY : "hsl(var(--theme-ink-primary))"
  const inkSecondary =
    variant === "overlay" ? SWITCHER_INK_SECONDARY : "hsl(var(--theme-ink-secondary))"
  const inkMuted =
    variant === "overlay" ? SWITCHER_INK_MUTED : "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))"

  const hasBackdrop = Boolean(domain.coverImageUrl)
  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"

  const handleClick = () => {
    sealPlaybillGreet(domain.slug, domain.leadAgentSlug)
    setIsPressed(true)
    onSelect(domain.slug)
    onClose?.()
  }

  const billingName = domain.name.trim() || domain.slug
  const starName = isUncast ? "Agent" : agent?.displayName ?? billingName
  const roleLine = isUncast ? "INNKEEPER" : agent?.roleLine ?? "INNKEEPER"
  const ariaLead = isUncast ? "Agent" : agent?.displayName ?? "lead agent"

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => onPrefetch?.(domain.slug)}
      onFocus={() => onPrefetch?.(domain.slug)}
      className={[
        "playbill-card w-full overflow-hidden text-left",
        variant === "overlay" ? "rounded-md" : "rounded-xl",
        className,
      ].join(" ")}
      style={{
        border: isCurrent
          ? "1.5px solid hsl(var(--theme-focus-ring))"
          : "1px solid hsl(var(--theme-border-soft) / 0.55)",
        background:
          variant === "overlay"
            ? "hsl(var(--theme-surface-panel, var(--theme-surface-raised)) / 0.92)"
            : "hsl(var(--theme-surface-elevated, 0 0% 100%))",
      }}
      aria-current={isCurrent ? "true" : undefined}
      aria-label={`${variant === "overlay" ? "Switch to" : "Open"} ${billingName} with ${ariaLead}${isCurrent ? " (current)" : ""}`}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -2,
            }
      }
      whileTap={reducedMotion ? undefined : { scale: 0.985 }}
      animate={
        isPressed && !reducedMotion
          ? { opacity: 0.72, scale: 0.98 }
          : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <p
        className="px-3 pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-[0.22em] truncate"
        style={{ color: inkMuted }}
      >
        {billingName} presents
      </p>

      <PresenceField
        className="mx-3"
        stageHeight={STAGE_HEIGHT}
        backdropUrl={hasBackdrop ? domain.coverImageUrl : null}
        backdropFallback={placeholderBackdrop(domain.slug)}
      >
        {isUncast ? (
          <div
            className="flex flex-col items-center gap-1 text-center"
            style={{ color: "hsl(var(--theme-ink-on-dark, 0 0% 98%))" }}
          >
            <span className="font-serif text-lg font-semibold">Agent</span>
          </div>
        ) : agent?.avatarUrl ? (
          <motion.img
            src={agent.avatarUrl}
            alt=""
            className="h-[5.5rem] w-[5.5rem] rounded-2xl object-cover object-center border"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
              boxShadow: "0 10px 28px hsl(var(--theme-shadow-color, 220 20% 4%) / 0.45)",
            }}
            whileHover={reducedMotion ? undefined : { y: -6, scale: 1.03 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : (
          <motion.div
            whileHover={reducedMotion ? undefined : { y: -6, scale: 1.03 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlaybillIconAvatar
              fallback={agent?.iconFallback ?? "?"}
              accent={accent}
            />
          </motion.div>
        )}
      </PresenceField>

      <div
        className="px-3 pt-2.5 pb-2"
        style={{ borderTop: "0.5px solid hsl(var(--theme-border-soft) / 0.45)" }}
      >
        <h3
          className={[
            "font-serif font-bold leading-tight truncate",
            variant === "overlay" ? "text-[15px]" : "text-base",
          ].join(" ")}
          style={{ color: inkPrimary }}
        >
          {isLoading && !isUncast ? "…" : starName}
        </h3>
        <p
          className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.16em] truncate"
          style={{ color: accent }}
        >
          {roleLine}
        </p>
        <p
          className="mt-1.5 text-[10px] leading-snug truncate"
          style={{ color: inkSecondary }}
          aria-live="polite"
        >
          {isLoading ? "Loading activity…" : activityLine}
        </p>
        {isCurrent ? (
          <p
            className="mt-1 text-[9px] font-medium uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-focus-ring))" }}
          >
            Current domain
          </p>
        ) : null}
      </div>
    </motion.button>
  )
}
