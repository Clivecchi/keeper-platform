/**
 * SidebarWorkspaceLayout
 * Responsive two-column layout: context sidebar + workspace panel.
 *
 * On large screens, renders as a grid with the sidebar taking ~37% and the
 * workspace taking ~63% of the width. On smaller screens, stacks vertically.
 *
 * The outer container includes a rounded border and translucent background
 * consistent with the Keeper design language.
 *
 * @example
 * <SidebarWorkspaceLayout
 *   sidebar={
 *     <>
 *       <SidebarCard title="Journeys" ... />
 *       <SidebarCard title="Keepers" ... />
 *     </>
 *   }
 *   sidebarLabel="Commons context"
 *   workspaceLabel="Commons workspace"
 * >
 *   {renderWorkspaceContent()}
 * </SidebarWorkspaceLayout>
 */

import * as React from "react"

const SURFACE = {
  border: "var(--theme-border-soft)",
}

export interface SidebarWorkspaceLayoutProps {
  /** Content rendered in the sidebar column */
  sidebar: React.ReactNode
  /** Content rendered in the workspace column (via children) */
  children: React.ReactNode
  /** Accessible label for the sidebar region */
  sidebarLabel?: string
  /** Accessible label for the workspace region */
  workspaceLabel?: string
  /** Override the default border color */
  borderColor?: string
  /** Override the default background color */
  backgroundColor?: string
  /** Optional class name for the outer wrapper */
  className?: string
}

export function SidebarWorkspaceLayout({
  sidebar,
  children,
  sidebarLabel = "Context sidebar",
  workspaceLabel = "Workspace",
  borderColor = SURFACE.border,
  backgroundColor = "hsl(var(--theme-surface-paper) / 0.88)",
  className = "",
}: SidebarWorkspaceLayoutProps) {
  return (
    <div
      className={`rounded-3xl border px-4 py-6 md:px-6 ${className}`}
      style={{ borderColor, backgroundColor }}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
        <aside aria-label={sidebarLabel} className="space-y-5">
          {sidebar}
        </aside>

        <section aria-label={workspaceLabel} className="space-y-6">
          {children}
        </section>
      </div>
    </div>
  )
}

export default SidebarWorkspaceLayout
