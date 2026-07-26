"use client"

import * as React from "react"

export interface PlaybillVisualProps {
  /** Blurred ambient layer — cover image or agent portrait. */
  ambientImageUrl: string | null
  /** Clear agent portrait on the right. */
  portraitUrl: string | null
  portraitFallback: string
  accent?: string
  /** `header` = top bar; `card` = dropdown list; `compact` = mobile dropdown denser row; `rail` = chronicle (deprecated). */
  size?: "header" | "card" | "hero" | "compact"
}

function isImageSrc(value: string): boolean {
  const v = value.trim()
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/api/") ||
    v.startsWith("data:image/")
  )
}

export function PlaybillAmbientLayer({
  imageUrl,
  accent,
  contained = false,
}: {
  imageUrl: string | null
  accent: string
  /** Contained atmospheric ground — not full-bleed wallpaper (location strip). */
  contained?: boolean
}) {
  if (imageUrl && isImageSrc(imageUrl)) {
    if (contained) {
      return (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background: "hsl(var(--theme-surface-panel, var(--theme-surface-elevated)) / 0.98)",
            }}
          />
          <div
            className="absolute inset-y-0 right-0 w-[42%] pointer-events-none overflow-hidden"
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.42,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(
                  to right,
                  hsl(var(--theme-surface-panel, 220 16% 11%) / 0.98) 0%,
                  hsl(var(--theme-surface-panel, 220 16% 11%) / 0.72) 55%,
                  transparent 100%
                )`,
              }}
            />
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background: `radial-gradient(
                ellipse 70% 90% at 92% 50%,
                ${accent}14 0%,
                transparent 65%
              )`,
            }}
          />
        </>
      )
    }

    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "right center",
            filter: "blur(22px) saturate(1.25)",
            transform: "scale(1.15)",
            opacity: 0.55,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `linear-gradient(
              to right,
              hsl(var(--theme-surface-panel, 220 16% 11%) / 0.96) 0%,
              hsl(var(--theme-surface-panel, 220 16% 11%) / 0.82) 48%,
              ${accent}18 72%,
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
          ${accent}22 0%,
          hsl(var(--theme-surface-panel, 220 16% 11%) / 0.94) 55%,
          hsl(var(--theme-surface-page, 220 16% 9%)) 100%
        )`,
      }}
    />
  )
}

export function PlaybillAgentPortrait({
  portraitUrl,
  portraitEmoji,
  fallback,
  accent,
  size,
}: {
  portraitUrl: string | null
  portraitEmoji?: string | null
  fallback: string
  accent: string
  size: "header" | "card" | "hero" | "compact"
}) {
  const dim = size === "hero" ? 112 : size === "header" ? 56 : size === "compact" ? 36 : 44
  const emojiSize = size === "hero" ? 48 : size === "header" ? 26 : size === "compact" ? 18 : 22
  const fallbackSize = size === "hero" ? 36 : size === "header" ? 20 : size === "compact" ? 15 : 17
  const emoji = portraitEmoji?.trim() || null

  if (portraitUrl && isImageSrc(portraitUrl)) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-xl border"
        style={{
          width: dim,
          height: dim,
          borderColor: `${accent}55`,
          boxShadow: `0 0 20px ${accent}28`,
        }}
      >
        <img
          src={portraitUrl}
          alt=""
          className="h-full w-full object-cover object-center"
          draggable={false}
        />
      </div>
    )
  }

  if (emoji) {
    return (
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border"
        style={{
          width: dim,
          height: dim,
          fontSize: emojiSize,
          lineHeight: 1,
          borderColor: `${accent}55`,
          background: `${accent}14`,
          boxShadow: `0 0 20px ${accent}22`,
        }}
        aria-hidden
      >
        {emoji}
      </div>
    )
  }

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border font-serif font-semibold"
      style={{
        width: dim,
        height: dim,
        fontSize: fallbackSize,
        borderColor: `${accent}55`,
        background: `${accent}14`,
        color: accent,
        boxShadow: `0 0 20px ${accent}22`,
      }}
      aria-hidden
    >
      {fallback.length <= 2 ? fallback : fallback.slice(0, 2)}
    </div>
  )
}

export function resolvePlaybillAmbientUrl(
  coverImageUrl: string | null | undefined,
  portraitUrl: string | null,
): string | null {
  if (coverImageUrl?.trim() && isImageSrc(coverImageUrl)) return coverImageUrl.trim()
  if (portraitUrl?.trim() && isImageSrc(portraitUrl)) return portraitUrl.trim()
  return null
}
