"use client";

import * as React from "react";
import { ChronicleActPresence } from "../../v0/presence/chronicleConfig/ChronicleActPresence";
import { useBoardEngagement } from "../../v0/boards/engagement/useBoardEngagement";
import { MomentEmotifBar } from "../../v0/frames/moment/MomentEmotifBar";
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
  const { domainId, refreshWorld, openKipWithMoment } = useMobileKeeper();
  const [moment, setMoment] = React.useState<MobileMomentDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const loadMoment = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchMomentDetail(momentId);
      setMoment(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load moment");
      setMoment(null);
    } finally {
      setLoading(false);
    }
  }, [momentId]);

  React.useEffect(() => {
    void loadMoment();
  }, [loadMoment]);

  const engagement = useBoardEngagement(() => {
    setIsEditing(false);
    void loadMoment();
    refreshWorld();
  });

  const { activateBySlug, intent, submitting, cancel } = engagement;

  React.useEffect(() => {
    if (!isEditing || !domainId || !moment) return;
    void activateBySlug("moment.update", {
      domainId,
      entityType: "moment",
      entityId: moment.id,
      title: moment.title,
      content: moment.narrative,
    });
  }, [isEditing, domainId, moment, activateBySlug]);

  const submitMomentUpdate = React.useCallback(
    async (inputs: Record<string, unknown>) => {
      setSubmitError(null);
      const payload = { ...inputs };
      if (typeof payload.content === "string" && payload.narrative === undefined) {
        payload.narrative = payload.content;
      }
      try {
        await engagement.handleSubmit(payload);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Could not update moment");
      }
    },
    [engagement.handleSubmit],
  );

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col"
      style={{ backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))" }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                cancel();
                setIsEditing(false);
                return;
              }
              onClose();
            }}
            className="rounded-lg px-2 py-1 text-sm"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Back
          </button>
          <p
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {isEditing ? "Edit moment" : "Moment"}
          </p>
        </div>

        {!loading && !error && moment && !isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openKipWithMoment(moment.id)}
              className="rounded-lg px-2 py-1 text-xs"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              Ask Kip
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg px-2 py-1 text-xs font-medium"
              style={{
                backgroundColor: "hsl(var(--theme-surface-panel))",
                color: "hsl(var(--theme-ink-primary))",
              }}
            >
              Edit
            </button>
          </div>
        ) : null}
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
        ) : isEditing && intent && moment ? (
          <ChronicleActPresence
            template={intent.template}
            context={intent.context}
            onSubmit={submitMomentUpdate}
            onClose={() => {
              cancel();
              setIsEditing(false);
            }}
            submitting={submitting}
            errorMessage={submitError}
          />
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

            <MomentEmotifBar
              momentId={moment.id}
              domainId={moment.domainId ?? domainId}
            />
          </article>
        ) : null}
      </div>
    </div>
  );
}
