"use client"

/**
 * AgentBoardIdlePanel
 *
 * Right panel idle state for Agent Board.
 * Shown when no agent and no draft is selected.
 *
 * Option B: standalone component — HomeViewPanel is IDE/Domain-specific
 * (requires platformName + activeJourneys data). This component matches
 * HomeViewPanel's visual treatment: Cormorant Garamond heading, secondary
 * tagline, hairline rule, centered feel — with Agent-appropriate copy.
 */

import * as React from "react"

function SectionRule() {
  return (
    <div
      className="my-5"
      style={{ height: 1, background: "hsl(var(--theme-line-hairline) / 0.45)" }}
    />
  )
}

export function AgentBoardIdlePanel() {
  return (
    <div
      className="keeper-panel-scroll flex flex-col h-full min-h-0 overflow-y-auto"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      <div className="px-5 pt-6">
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "28px",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          Agent Studio
        </p>
        <p
          className="mt-1.5 text-[13px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Select an agent to view details
        </p>
        <SectionRule />
      </div>

      <div className="px-5 pb-8">
        <p
          className="text-[12px] italic"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Choose an agent from the left panel, or select a draft to review.
        </p>
      </div>
    </div>
  )
}
