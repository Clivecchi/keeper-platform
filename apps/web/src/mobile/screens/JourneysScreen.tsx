"use client";

import * as React from "react";
import { useUniversalMobile } from "../hooks/useUniversalMobile";
import { fetchDomainJourneys, fetchJourneyWithMoments } from "../lib/mobileApi";
import type { MobileJourneySummary } from "../types";

export function JourneysScreen() {
  const { domainId, openMoment, setActiveJourneyId, setActiveTab } = useUniversalMobile();
  const [journeys, setJourneys] = React.useState<MobileJourneySummary[]>([]);
  const [expandedJourneyId, setExpandedJourneyId] = React.useState<string | null>(null);
  const [momentsByJourney, setMomentsByJourney] = React.useState<
    Record<string, Array<{ id: string; title: string; narrative?: string | null; keptAt?: string | null }>>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [loadingMoments, setLoadingMoments] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!domainId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchDomainJourneys(domainId!);
        if (!cancelled) setJourneys(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load journeys");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [domainId]);

  const toggleJourney = React.useCallback(
    async (journeyId: string) => {
      if (expandedJourneyId === journeyId) {
        setExpandedJourneyId(null);
        return;
      }

      setExpandedJourneyId(journeyId);
      if (momentsByJourney[journeyId]) return;

      setLoadingMoments(journeyId);
      try {
        const journey = await fetchJourneyWithMoments(journeyId);
        setMomentsByJourney((prev) => ({
          ...prev,
          [journeyId]: journey.moment,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load journey moments");
      } finally {
        setLoadingMoments(null);
      }
    },
    [expandedJourneyId, momentsByJourney],
  );

  if (!domainId) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Your domain is still loading…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading journeys…
      </div>
    );
  }

  if (error && journeys.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
        {error}
      </div>
    );
  }

  if (journeys.length === 0) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          No journeys yet. Journeys hold the paths your moments unfold through.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {journeys.map((journey) => {
        const expanded = expandedJourneyId === journey.id;
        const moments = momentsByJourney[journey.id] ?? [];

        return (
          <div
            key={journey.id}
            className="overflow-hidden rounded-2xl border"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.55)",
            }}
          >
            <button
              type="button"
              onClick={() => void toggleJourney(journey.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {journey.name}
                </div>
                <div
                  className="mt-1 text-[11px]"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {journey.momentCount ?? 0} moments
                </div>
              </div>
              <span style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {expanded ? "−" : "+"}
              </span>
            </button>

            {expanded ? (
              <div
                className="border-t px-3 pb-3 pt-2"
                style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}
              >
                {loadingMoments === journey.id ? (
                  <p className="px-1 py-2 text-xs" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    Loading moments…
                  </p>
                ) : moments.length === 0 ? (
                  <p className="px-1 py-2 text-xs" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    No moments in this journey yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {moments.map((moment) => (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => openMoment(moment.id)}
                        className="w-full rounded-xl border px-3 py-2 text-left"
                        style={{
                          borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                          backgroundColor: "hsl(var(--theme-surface-page) / 0.5)",
                        }}
                      >
                        <div
                          className="text-sm font-medium"
                          style={{ color: "hsl(var(--theme-ink-primary))" }}
                        >
                          {moment.title || "Untitled moment"}
                        </div>
                        {moment.narrative ? (
                          <p
                            className="mt-1 line-clamp-2 text-xs"
                            style={{ color: "hsl(var(--theme-ink-secondary))" }}
                          >
                            {moment.narrative}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveJourneyId(journey.id);
                    setActiveTab("moment");
                  }}
                  className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    backgroundColor: "hsl(var(--theme-ink-primary, 20 14% 14%))",
                    color: "hsl(var(--theme-surface-page, 40 20% 97%))",
                  }}
                >
                  Capture a moment here
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
