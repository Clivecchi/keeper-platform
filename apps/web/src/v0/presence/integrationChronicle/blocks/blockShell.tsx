"use client"

import * as React from "react"

export function BlockShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-md border px-3 py-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      {children}
    </div>
  )
}

export function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wide mb-2"
      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
    >
      {children}
    </p>
  )
}

export function BlockBadge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "success" | "warning" | "error" | "info"
}) {
  const colors: Record<string, string> = {
    neutral: "hsl(var(--theme-border-soft) / 0.55)",
    success: "hsl(152 69% 43% / 0.25)",
    warning: "hsl(38 92% 50% / 0.25)",
    error: "hsl(0 70% 50% / 0.2)",
    info: "hsl(210 80% 55% / 0.2)",
  }
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        borderColor: colors[tone],
        color: "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label}
    </span>
  )
}
