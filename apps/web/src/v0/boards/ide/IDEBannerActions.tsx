"use client"

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface IDEBannerActionsProps {
  /** Fires a pre-composed prompt string into the Kip conversation */
  onAction: (prompt: string) => void
  activeJourneyId?: string | null
  activeMomentId?: string | null
}

// ─── Action definitions ───────────────────────────────────────────────────────

const BANNER_ACTIONS = [
  {
    slug: "cloud.review",
    label: "Review with Cloud",
    prompt:
      "Please invoke Cloud to review the current state of the active Moment or Draft and return a summary of findings.",
  },
  {
    slug: "cloud.deploy.railway",
    label: "Deploy to Railway",
    prompt:
      "Please invoke Cloud to deploy the current build to Railway and report the result.",
  },
  {
    slug: "cloud.deploy.vercel",
    label: "Deploy to Vercel",
    prompt:
      "Please invoke Cloud to deploy the current build to Vercel and report the result.",
  },
  {
    slug: "draft.create",
    label: "New Draft",
    prompt:
      "Please create a new draft for the current Development Journey session.",
  },
  {
    slug: "sole.save",
    label: "Save to Memory",
    prompt:
      "Please save the key context from this session to SOLE memory.",
  },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBannerActions({
  onAction,
}: IDEBannerActionsProps) {
  return (
    <div className="flex flex-row gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
      {BANNER_ACTIONS.map((action) => (
        <button
          key={action.slug}
          type="button"
          onClick={() => onAction(action.prompt)}
          className={[
            "shrink-0",
            "rounded-full border px-3 py-1",
            "text-xs font-medium",
            "transition-colors",
            "border-[hsl(var(--theme-accent,220_90%_56%))]",
            "text-[hsl(var(--theme-accent,220_90%_56%))]",
            "bg-transparent",
            "hover:bg-[hsl(var(--theme-accent,220_90%_56%)/0.10)]",
          ].join(" ")}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
