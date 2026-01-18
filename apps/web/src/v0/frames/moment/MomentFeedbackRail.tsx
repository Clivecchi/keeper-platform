import type { CSSProperties } from "react"

export type FeedbackTone = "default" | "muted" | "error"

export interface FeedbackStatusItem {
  id: string
  label: string
  tone?: FeedbackTone
}

export type FeedbackActionVariant = "pill" | "compact"

export interface FeedbackAction {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: FeedbackActionVariant
  ariaLabel?: string
}

export interface FeedbackRailContext {
  containerClassName?: string
  containerStyle?: CSSProperties
}

export interface MomentFeedbackRailProps {
  statusItems: FeedbackStatusItem[]
  primaryAction?: FeedbackAction | null
  secondaryActions?: FeedbackAction[]
  context?: FeedbackRailContext
}

const baseChipStyle: CSSProperties = {
  backgroundColor: "var(--theme-surface-paper)",
  boxShadow: "var(--theme-shadow-soft)",
}

const baseActionStyle: CSSProperties = {
  borderColor: "var(--theme-border-soft)",
  color: "var(--theme-ink-tertiary)",
  backgroundColor: "var(--theme-surface-paper)",
  boxShadow: "var(--theme-shadow-soft)",
}

const toneToColor = (tone?: FeedbackTone) => {
  if (tone === "error") return "var(--theme-ink-error, #ef4444)"
  if (tone === "muted") return "var(--theme-ink-secondary)"
  return "var(--theme-ink-tertiary)"
}

export function MomentFeedbackRail({
  statusItems,
  primaryAction,
  secondaryActions = [],
  context,
}: MomentFeedbackRailProps) {
  return (
    <div
      className={`flex flex-col items-end gap-2 text-[11px] ${context?.containerClassName ?? ""}`}
      style={context?.containerStyle}
    >
      {statusItems.map((item) => (
        <span
          key={item.id}
          className="rounded-full px-4 py-2"
          style={{
            ...baseChipStyle,
            color: toneToColor(item.tone),
          }}
        >
          {item.label}
        </span>
      ))}

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex items-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
              style={baseActionStyle}
              aria-label={primaryAction.ariaLabel ?? primaryAction.label}
            >
              <span>{primaryAction.label}</span>
            </button>
          )}
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.variant === "compact"
                  ? "inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                  : "inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
              }
              style={baseActionStyle}
              aria-label={action.ariaLabel ?? action.label}
            >
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
