"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Cog6ToothIcon, PlayIcon } from "@heroicons/react/24/outline"
import type {
  CoverActionDef,
  CoverHeroContent,
  CoverIdentityContent,
  CoverTraitItem,
  ResolvedCoverContent,
} from "./coverTypes"
import { useCoverMotion } from "./coverMotion"

export interface EntityCoverPresenceProps {
  content: ResolvedCoverContent
  instanceKey: string
}

function resolveAccent(themeColor: string): string {
  const t = themeColor.trim()
  if (!t) return "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))"
  if (t.startsWith("hsl") || t.startsWith("#") || t.startsWith("rgb")) return t
  return `hsl(var(--theme-${t}, var(--theme-accent-primary)))`
}

function isAvatarImageSrc(value: string): boolean {
  const v = value.trim()
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/api/") ||
    v.startsWith("data:image/")
  )
}

function glowColor(glow: CoverHeroContent["avatarGlow"]): string {
  if (glow === "error") return "hsl(var(--theme-status-error, 38 92% 50%))"
  if (glow === "active") return "hsl(var(--theme-status-success, 152 69% 43%))"
  return "hsl(var(--theme-ink-tertiary))"
}

function CoverActionButton({ action }: { action: CoverActionDef }) {
  const isPrimary = action.variant === "primary"
  const Icon = action.icon === "gear" ? Cog6ToothIcon : action.icon === "play" ? PlayIcon : null

  return (
    <button
      type="button"
      onClick={action.onClick}
      className="flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-semibold transition-opacity hover:opacity-85"
      style={
        isPrimary
          ? {
              background: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.18)",
              border: "1px solid hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.45)",
              color: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))",
            }
          : {
              background: "transparent",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              color: "hsl(var(--theme-ink-secondary))",
            }
      }
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
      {action.label}
    </button>
  )
}

function AmbientVisualLayer({
  accent,
  imageSrc,
}: {
  accent: string
  imageSrc: string | null
}) {
  if (imageSrc) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            filter: "blur(28px) saturate(1.35)",
            transform: "scale(1.2)",
            opacity: 0.5,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `linear-gradient(
              to right,
              hsl(var(--theme-surface-panel) / 0.97) 0%,
              hsl(var(--theme-surface-panel) / 0.88) 42%,
              ${accent}22 62%,
              transparent 100%
            )`,
          }}
        />
      </>
    )
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
      style={{
        background: `radial-gradient(
          ellipse 90% 120% at 88% 50%,
          ${accent}28 0%,
          hsl(var(--theme-surface-panel) / 0.92) 55%,
          hsl(var(--theme-surface-page)) 100%
        )`,
      }}
    />
  )
}

function CoverVisualSlot({
  accent,
  imageSrc,
  displayFallback,
  glow,
  glowScale,
}: {
  accent: string
  imageSrc: string | null
  displayFallback: string
  glow: string
  glowScale: ReturnType<typeof useCoverMotion>["glowScale"]
}) {
  if (imageSrc) {
    return (
      <div className="relative h-full min-h-[7.5rem] w-full overflow-visible">
        <motion.div
          className="absolute inset-y-0 right-[-12%] w-[112%] overflow-hidden rounded-l-2xl"
          style={{
            boxShadow: `-8px 0 32px ${accent}33`,
            borderLeft: `1px solid ${accent}44`,
          }}
        >
          <img
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background: `linear-gradient(
                to right,
                hsl(var(--theme-surface-panel) / 0.55) 0%,
                transparent 38%
              )`,
            }}
          />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-[7.5rem] items-center justify-end pr-1">
      <motion.div
        className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center overflow-hidden rounded-2xl border"
        style={{
          borderColor: `${accent}55`,
          background: `${accent}12`,
          boxShadow: `0 0 28px ${accent}33`,
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle, ${glow}44 0%, transparent 70%)`,
            scale: glowScale,
          }}
          aria-hidden
        />
        <span
          className="relative text-3xl font-semibold select-none"
          style={{ color: accent }}
          aria-hidden={!displayFallback}
        >
          {displayFallback.length <= 2 ? (
            displayFallback
          ) : (
            <span className="text-[11px] font-mono truncate px-1">{displayFallback.slice(0, 8)}</span>
          )}
        </span>
      </motion.div>
    </div>
  )
}

/**
 * Merged hero + identity band — text left, visual right with ambient bleed.
 */
function UnifiedCoverHeader({
  hero,
  identity,
  motionValues,
  heroY,
  nameOpacity,
  glowScale,
}: {
  hero: CoverHeroContent
  identity: CoverIdentityContent
  motionValues: ReturnType<typeof useCoverMotion>["values"]
  heroY: ReturnType<typeof useCoverMotion>["heroY"]
  nameOpacity: ReturnType<typeof useCoverMotion>["nameOpacity"]
  glowScale: ReturnType<typeof useCoverMotion>["glowScale"]
}) {
  const accent = resolveAccent(hero.accentColor)
  const displayAvatar = hero.avatar?.trim() || "◇"
  const glow = glowColor(hero.avatarGlow)
  const avatarIsImage = isAvatarImageSrc(displayAvatar)
  const imageSrc = avatarIsImage ? displayAvatar : null
  const voiceText = identity.voiceQuote?.trim()

  return (
    <motion.div
      className="relative overflow-hidden rounded-t-xl"
      style={{
        y: heroY,
        opacity: motionValues.heroEntrance,
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)",
      }}
    >
      <AmbientVisualLayer accent={accent} imageSrc={imageSrc} />

      {hero.chromeTitle && (
        <div
          className="relative z-10 flex items-center justify-between px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.18em]"
          style={{
            borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.25)",
            color: "hsl(var(--theme-ink-tertiary))",
            background: "hsl(var(--theme-surface-elevated) / 0.55)",
          }}
        >
          <span className="flex gap-1" aria-hidden>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--theme-ink-tertiary) / 0.5)" }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--theme-ink-tertiary) / 0.35)" }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(var(--theme-ink-tertiary) / 0.25)" }} />
          </span>
          <span className="truncate max-w-[60%]">{hero.chromeTitle}</span>
          <span className="flex gap-1 opacity-0" aria-hidden>
            <span className="w-1.5 h-1.5 rounded-full" />
          </span>
        </div>
      )}

      <div className="relative z-10 px-4 pt-4 pb-3">
        {hero.statusLabel && (
          <div
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: glow,
                scale: glowScale,
              }}
            />
            {hero.statusLabel}
          </div>
        )}

        <div className="flex gap-3 items-stretch min-h-[7.5rem]">
          <div className="flex-1 min-w-0 flex flex-col justify-center py-1 pr-2 max-w-[58%]">
            <motion.h2
              className="font-serif text-[26px] font-bold leading-tight tracking-tight"
              style={{ color: "hsl(var(--theme-ink-primary))", opacity: nameOpacity }}
            >
              {identity.name || "Untitled agent"}
            </motion.h2>

            {identity.roleLine?.trim() && (
              <motion.p
                className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.16em]"
                style={{ color: accent, opacity: nameOpacity }}
              >
                {identity.roleLine}
              </motion.p>
            )}

            {voiceText && (
              <motion.div
                className="mt-3 flex gap-3"
                style={{ opacity: nameOpacity }}
              >
                <div
                  className="shrink-0 w-0.5 rounded-full self-stretch min-h-[2rem]"
                  style={{ background: accent }}
                  aria-hidden
                />
                <p
                  className="text-[13px] italic leading-relaxed line-clamp-3"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {voiceText}
                </p>
              </motion.div>
            )}
          </div>

          <div className="relative w-[42%] max-w-[9.5rem] shrink-0 self-stretch">
            <CoverVisualSlot
              accent={accent}
              imageSrc={imageSrc}
              displayFallback={displayAvatar}
              glow={glow}
              glowScale={glowScale}
            />
          </div>
        </div>

        {(hero.frameLabel || hero.roleLabel) && (
          <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-mono uppercase tracking-wider">
            {hero.frameLabel ? (
              <p style={{ color: "hsl(var(--theme-ink-tertiary))" }}>{hero.frameLabel}</p>
            ) : (
              <span aria-hidden />
            )}
            {hero.roleLabel ? (
              <p className="text-right truncate max-w-[45%]" style={{ color: accent }}>
                {hero.roleLabel}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TraitStrip({ traits }: { traits: CoverTraitItem[] }) {
  if (traits.length === 0) return null

  return (
    <div
      className="mx-4 py-3 flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] font-mono uppercase tracking-wide"
      style={{
        borderTop: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        color: "hsl(var(--theme-ink-tertiary))",
      }}
    >
      {traits.map((trait, i) => (
        <React.Fragment key={`${trait.label}-${i}`}>
          {i > 0 && (
            <span className="mx-1 opacity-40" aria-hidden>
              ·
            </span>
          )}
          <span className="whitespace-nowrap">
            <span className="opacity-70">{trait.label}</span>{" "}
            <span
              className="font-semibold normal-case tracking-normal"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {trait.pulse && (
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                  style={{ background: "hsl(var(--theme-status-success, 152 69% 43%))" }}
                  aria-hidden
                />
              )}
              {trait.value}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

function CreditsSlot({ credits }: { credits: string[] }) {
  if (credits.length === 0) return null

  return (
    <div className="px-4 pt-4 pb-2">
      <p
        className="text-[9px] font-mono uppercase tracking-[0.2em] mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary) / 0.7)" }}
      >
        Credits
      </p>
      <div className="flex flex-wrap gap-1.5">
        {credits.map((chip) => (
          <span
            key={chip}
            className="rounded px-2 py-0.5 text-[10px] font-mono"
            style={{
              border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
              color: "hsl(var(--theme-ink-tertiary))",
              background: "hsl(var(--theme-surface-elevated) / 0.35)",
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}

function ActionsSlot({ actions }: { actions: CoverActionDef[] }) {
  if (actions.length === 0) return null

  const secondary = actions.filter((a) => a.variant === "secondary")
  const primary = actions.filter((a) => a.variant === "primary")

  return (
    <div className="px-4 pt-3 pb-4 flex gap-2">
      {secondary.map((a) => (
        <CoverActionButton key={a.id} action={a} />
      ))}
      {primary.map((a) => (
        <CoverActionButton key={a.id} action={a} />
      ))}
    </div>
  )
}

/**
 * Layer 1 — Universal cover slot structure.
 * Renders merged header (hero + identity), traits, credits, and actions.
 */
export function EntityCoverPresence({ content, instanceKey }: EntityCoverPresenceProps) {
  const { values, heroY, nameOpacity, glowScale } = useCoverMotion(instanceKey)

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-panel) / 0.6)",
        opacity: values.atmosphereOpacity,
      }}
      data-cover-mode="cover"
    >
      <UnifiedCoverHeader
        hero={content.hero}
        identity={content.identity}
        motionValues={values}
        heroY={heroY}
        nameOpacity={nameOpacity}
        glowScale={glowScale}
      />
      <TraitStrip traits={content.traits} />
      <CreditsSlot credits={content.credits} />
      <ActionsSlot actions={content.actions} />
    </motion.div>
  )
}
