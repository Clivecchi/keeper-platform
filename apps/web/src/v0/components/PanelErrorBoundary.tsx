"use client"

import * as React from "react"

export type BoardPanelId = "nav" | "dialog" | "chronicle"

const PANEL_LABELS: Record<BoardPanelId, string> = {
  nav: "Navigation",
  dialog: "Dialog",
  chronicle: "Chronicle",
}

export interface PanelErrorBoundaryProps {
  panel: BoardPanelId
  /** Overrides the default panel label in the fallback UI. */
  panelLabel?: string
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
}

interface PanelErrorBoundaryState {
  hasError: boolean
  error?: Error
  resetKey: number
}

/**
 * Isolates a Universal Board panel so one panel crash does not unmount the whole board.
 * Composer draft autosave (sessionStorage) survives a dialog reset via Try again.
 */
export class PanelErrorBoundary extends React.Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, resetKey: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<PanelErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[PanelErrorBoundary:${this.props.panel}] caught an error:`, error, errorInfo)
  }

  private handleTryAgain = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      resetKey: prev.resetKey + 1,
    }))
    this.props.onReset?.()
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const label = this.props.panelLabel ?? PANEL_LABELS[this.props.panel]
      const devMessage =
        import.meta.env.DEV && this.state.error?.message
          ? this.state.error.message
          : null

      return (
        <div
          className="flex h-full min-h-0 flex-col items-center justify-center p-6 text-center"
          style={{
            background: "hsl(var(--theme-surface-panel) / 0.55)",
            borderRadius: "8px",
            border: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          }}
          role="alert"
        >
          <p
            className="text-sm font-semibold"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {label} ran into a problem
          </p>
          <p
            className="mt-2 max-w-sm text-xs leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {devMessage
              ? devMessage
              : "The rest of the board is still available. Your unsent composer draft is saved in this tab when possible."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              style={{
                background: "hsl(var(--theme-ink-primary))",
                color: "hsl(var(--theme-surface-paper))",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
              style={{
                borderColor: "hsl(var(--theme-border-soft))",
                color: "hsl(var(--theme-ink-secondary))",
                background: "transparent",
              }}
            >
              Refresh page
            </button>
          </div>
        </div>
      )
    }

    return (
      <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
    )
  }
}

export default PanelErrorBoundary
