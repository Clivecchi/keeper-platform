"use client"

import * as React from "react"

export interface PresenceFieldProps {
  /** Portrait or mark — owner's choice. */
  children: React.ReactNode
  className?: string
  /** Height of the atmospheric field stage. */
  stageHeight?: number | string
  /** Optional cover image behind the atmospheric field. */
  backdropUrl?: string | null
  /** CSS gradient when no backdrop image. */
  backdropFallback?: string
}

/**
 * Named Treatment pattern: crisp presence image floating over a larger,
 * darker, atmospheric opaque field. Ground tint flows from Treatment CSS vars.
 */
export function PresenceField({
  children,
  className = "",
  stageHeight = 148,
  backdropUrl,
  backdropFallback,
}: PresenceFieldProps) {
  return (
    <div
      className={["presence-field relative overflow-hidden rounded-lg", className].join(" ")}
      style={{
        height: stageHeight,
        background: backdropUrl
          ? undefined
          : backdropFallback ||
            "linear-gradient(160deg, hsl(var(--theme-treatment-field, var(--theme-accent-primary)) / 0.22) 0%, hsl(var(--theme-surface-page) / 0.92) 48%, hsl(var(--theme-surface-page) / 0.98) 100%)",
        boxShadow: "inset 0 0 0 1px hsl(var(--theme-border-soft) / 0.35)",
      }}
    >
      {backdropUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backdropUrl})` }}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, hsl(var(--theme-surface-page, 220 18% 8%) / 0.82) 0%, hsl(var(--theme-surface-page, 220 18% 8%) / 0.18) 52%, transparent 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 100%, hsl(var(--theme-accent-primary) / 0.18) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative flex h-full items-end justify-center pb-3 px-3">{children}</div>
    </div>
  )
}
