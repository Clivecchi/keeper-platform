"use client";

import type { MobileKipResponseView } from "../hooks/useMobileKipDialogStage";

export interface MobileKipResponseToolbarProps {
  view: MobileKipResponseView;
  onViewChange: (view: MobileKipResponseView) => void;
}

export function MobileKipResponseToolbar({
  view,
  onViewChange,
}: MobileKipResponseToolbarProps) {
  return (
    <div
      className="mobile-kip-response-toolbar shrink-0 px-4 py-2"
      style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)" }}
    >
      <div
        className="inline-flex rounded-xl p-0.5"
        style={{ backgroundColor: "hsl(var(--theme-surface-panel) / 0.55)" }}
        role="tablist"
        aria-label="Response view"
      >
        {(["text", "chronicle"] as const).map((option) => {
          const active = view === option;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(option)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors"
              style={{
                color: active
                  ? "hsl(var(--theme-ink-primary))"
                  : "hsl(var(--theme-ink-secondary))",
                backgroundColor: active
                  ? "hsl(var(--theme-surface-page) / 0.9)"
                  : "transparent",
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
