"use client";

import * as React from "react";
import { useMobileKeeper } from "../context/MobileKeeperContext";
import { fetchMomentDetail } from "../lib/mobileApi";
import type { MobileMomentDetail } from "../types";

export interface MomentDetailScreenProps {
  momentId: string;
  onClose: () => void;
}

function formatWhen(value: string | null): string {
  if (!value) return "Kept recently";
  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Kept recently";
  }
}

export function MomentDetailScreen({ momentId, onClose }: MomentDetailScreenProps) {
  const [moment, setMoment] = React.useState<MobileMomentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchMomentDetail(momentId);
        if (!cancelled) setMoment(detail);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load moment");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [momentId]);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))" }}
    >
      <div
        className="flex items-center gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Back
        </button>
        <p
          className="text-[11px] uppercase tracking-[0.22em]"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Moment
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Opening moment…
          </p>
        ) : error ? (
          <p className="text-sm" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
            {error}
          </p>
        ) : moment ? (
          <article className="space-y-4">
            <div>
              <h2
                className="text-xl font-medium leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {moment.title || "Untitled moment"}
              </h2>
              <p
                className="mt-2 text-xs"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {formatWhen(moment.keptAt)}
              </p>
              {(moment.journeyName || moment.pathName) ? (
                <p
                  className="mt-2 text-xs"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {[moment.journeyName, moment.pathName].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div
              className="rounded-2xl border px-4 py-4"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.55)",
              }}
            >
              <p
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
              >
                {moment.narrative || "No narrative yet."}
              </p>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  );
}
