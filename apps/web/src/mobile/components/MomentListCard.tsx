"use client";

import type { KeptMomentSummary } from "../../v0/api/v0Moments";

export interface MomentListCardProps {
  moment: KeptMomentSummary;
  onOpen: (momentId: string) => void;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "Kept recently";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Kept recently";
  }
}

export function MomentListCard({ moment, onOpen }: MomentListCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(moment.id)}
      className="w-full rounded-2xl border px-4 py-3 text-left transition-opacity hover:opacity-90"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.65)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-sm font-medium"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {moment.title || "Untitled moment"}
        </div>
        {moment.journeyName ? (
          <span
            className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: "hsl(var(--theme-surface-panel) / 0.9)",
              color: "hsl(var(--theme-ink-secondary))",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
            }}
          >
            {moment.journeyName}
          </span>
        ) : null}
      </div>
      <p
        className="mt-1 text-[11px]"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {formatWhen(moment.keptAt)}
      </p>
      {moment.body ? (
        <p
          className="mt-2 line-clamp-3 text-xs leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {moment.body}
        </p>
      ) : null}
    </button>
  );
}
