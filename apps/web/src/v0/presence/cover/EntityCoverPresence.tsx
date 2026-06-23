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

function CropMarks() {
  const mark = "absolute w-4 h-4 pointer-events-none"
  const stroke = "hsl(var(--theme-ink-primary) / 0.35)"
  return (
    <>
      <span className={`${mark} top-3 left-3 border-t border-l`} style={{ borderColor: stroke }} aria-hidden />
      <span className={`${mark} top-3 right-3 border-t border-r`} style={{ borderColor: stroke }} aria-hidden />
      <span className={`${mark} bottom-3 left-3 border-b border-l`} style={{ borderColor: stroke }} aria-hidden />
      <span className={`${mark} bottom-3 right-3 border-b border-r`} style={{ borderColor: stroke }} aria-hidden />
    </>
  )
}

function HeroSlot({
  hero,
  motionValues,
  heroY,
  glowScale,
}: {
  hero: CoverHeroContent
  motionValues: ReturnType<typeof useCoverMotion>["values"]
  heroY: ReturnType<typeof useCoverMotion>["heroY"]
  glowScale: ReturnType<typeof useCoverMotion>["glowScale"]
}) {
  const accent = resolveAccent(hero.accentColor)
  const displayAvatar = hero.avatar?.trim() || "◇"
  const glow = glowColor(hero.avatarGlow)
  const avatarIsImage = isAvatarImageSrc(displayAvatar)

  return (
    <motion.div
      className="relative overflow-hidden rounded-t-xl"
      style={{
        y: heroY,
        opacity: motionValues.heroEntrance,
        background: `radial-gradient(ellipse 80% 70% at 50% 45%, ${accent}22 0%, hsl(var(--theme-surface-panel) / 0.95) 55%, hsl(var(--theme-surface-page)) 100%)`,
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)",
      }}
    >
      {/* Window chrome */}
      {hero.chromeTitle && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-[9px] font-mono uppercase tracking-[0.18em]"
          style={{
            borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.25)",
            color: "hsl(var(--theme-ink-tertiary))",
            background: "hsl(var(--theme-surface-elevated) / 0.4)",
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

      <div className="relative px-4 pt-5 pb-4 min-h-[140px] flex items-center justify-center">
        <CropMarks />

        {hero.statusLabel && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest"
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

        <motion.div
          className="relative flex items-center justify-center rounded-full border overflow-hidden"
          style={{
            width: 88,
            height: 88,
            borderColor: `${accent}55`,
            background: avatarIsImage ? "hsl(var(--theme-surface-panel))" : `${accent}12`,
            boxShadow: `0 0 32px ${accent}33`,
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${glow}44 0%, transparent 70%)`,
              scale: glowScale,
            }}
            aria-hidden
          />
          {avatarIsImage ? (
            <img
              src={displayAvatar}
              alt=""
              className="relative h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <span
              className="relative text-3xl font-semibold select-none"
              style={{ color: accent }}
              aria-hidden={!hero.avatar}
            >
              {displayAvatar.length <= 2 ? (
                displayAvatar
              ) : (
                <span className="text-[11px] font-mono truncate px-1">{displayAvatar.slice(0, 8)}</span>
              )}
            </span>
          )}
        </motion.div>

        {hero.frameLabel && (
          <p
            className="absolute bottom-3 left-4 text-[9px] font-mono uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {hero.frameLabel}
          </p>
        )}
        {hero.roleLabel && (
          <p
            className="absolute bottom-3 right-4 text-[9px] font-mono uppercase tracking-wider text-right max-w-[45%] truncate"
            style={{ color: accent }}
          >
            {hero.roleLabel}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function IdentitySlot({
  identity,
  nameOpacity,
}: {
  identity: CoverIdentityContent
  nameOpacity: ReturnType<typeof useCoverMotion>["nameOpacity"]
}) {
  const voiceText = identity.voiceQuote?.trim()

  return (
    <div className="px-4 pt-5 pb-4">
      <motion.h2
        className="font-serif text-[28px] font-bold leading-tight tracking-tight"
        style={{ color: "hsl(var(--theme-ink-primary))", opacity: nameOpacity }}
      >
        {identity.name || "Untitled agent"}
      </motion.h2>

      {identity.roleLine?.trim() && (
        <motion.p
          className="mt-1.5 text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: "hsl(var(--theme-ink-tertiary))", opacity: nameOpacity }}
        >
          {identity.roleLine}
        </motion.p>
      )}

      {voiceText && (
        <motion.div
          className="mt-4 flex gap-3"
          style={{ opacity: nameOpacity }}
        >
          <div
            className="shrink-0 w-0.5 rounded-full self-stretch min-h-[2.5rem]"
            style={{ background: "hsl(var(--theme-accent-primary, var(--theme-ink-secondary)))" }}
            aria-hidden
          />
          <p
            className="text-[13px] italic leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {voiceText}
          </p>
        </motion.div>
      )}
    </div>
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
 * Renders hero, identity, traits, credits, and actions in fixed positions.
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
      <HeroSlot
        hero={content.hero}
        motionValues={values}
        heroY={heroY}
        glowScale={glowScale}
      />
      <IdentitySlot identity={content.identity} nameOpacity={nameOpacity} />
      <TraitStrip traits={content.traits} />
      <CreditsSlot credits={content.credits} />
      <ActionsSlot actions={content.actions} />
    </motion.div>
  )
}
