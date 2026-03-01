/**
 * WorkspaceHeader
 * Consistent header for workspace mode panels.
 *
 * Renders an eyebrow label (typically the mode name), a title, a description,
 * and a divider line. Used at the top of each workspace mode's content area
 * to orient the user.
 *
 * @example
 * <WorkspaceHeader
 *   eyebrow="Observe"
 *   title="Commons activity"
 *   description="A continuous view of what is alive in the commons."
 * />
 *
 * @example
 * // Agent workspace
 * <WorkspaceHeader
 *   eyebrow="Dialogue"
 *   title="Active session"
 *   description="Continue your conversation with Kip."
 * />
 */

import * as React from "react"

const SURFACE = {
  border: "hsl(var(--theme-border-soft))",
  inkPrimary: "var(--theme-ink-primary-color)",
  inkSecondary: "var(--theme-ink-secondary-color)",
}

export interface WorkspaceHeaderProps {
  /** Small uppercase label above the title (e.g. mode name) */
  eyebrow: string
  /** Main heading */
  title: string
  /** Brief description of the workspace mode */
  description: string
  /** Optional class name for the outer wrapper */
  className?: string
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  className = "",
}: WorkspaceHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p
        className="text-[11px] uppercase tracking-[0.25em]"
        style={{ color: SURFACE.inkSecondary }}
      >
        {eyebrow}
      </p>
      <h3 className="text-xl font-semibold" style={{ color: SURFACE.inkPrimary }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: SURFACE.inkSecondary }}>
        {description}
      </p>
      <div className="h-px w-full" style={{ backgroundColor: SURFACE.border }} />
    </div>
  )
}

export default WorkspaceHeader
