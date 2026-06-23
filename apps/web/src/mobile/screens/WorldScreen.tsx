"use client";

import * as React from "react";
import { MomentListCard } from "../components/MomentListCard";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useMobileKeeper } from "../context/MobileKeeperContext";
import { fetchKeptMomentsForWorld } from "../lib/mobileApi";
import type { KeptMomentSummary } from "../../v0/api/v0Moments";

export function WorldScreen() {
  const { domainSlug, worldRefreshKey, openMoment, refreshWorld } = useMobileKeeper();
  const [moments, setMoments] = React.useState<KeptMomentSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadMoments = React.useCallback(async () => {
    setError(null);
    try {
      const data = await fetchKeptMomentsForWorld({ domainSlug, limit: 50 });
      setMoments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your world");
      setMoments([]);
    } finally {
      setLoading(false);
    }
  }, [domainSlug]);

  React.useEffect(() => {
    setLoading(true);
    void loadMoments();
  }, [loadMoments, worldRefreshKey]);

  const { containerRef, pullDistance, isRefreshing, touchHandlers } = usePullToRefresh({
    onRefresh: async () => {
      refreshWorld();
      await loadMoments();
    },
    disabled: loading,
  });

  if (loading && moments.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading your kept moments…
      </div>
    );
  }

  if (error && moments.length === 0) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
        {error}
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Nothing kept yet. When something matters, tap Keep and bring it here.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-full"
      {...touchHandlers}
    >
      {(pullDistance > 0 || isRefreshing) ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center py-2 text-xs"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {isRefreshing ? "Refreshing…" : "Pull to refresh"}
        </div>
      ) : null}

      <div
        className="space-y-3 px-4 py-4 transition-transform"
        style={{ transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance * 0.35, 28)}px)` : undefined }}
      >
        {moments.map((moment) => (
          <MomentListCard key={moment.id} moment={moment} onOpen={openMoment} />
        ))}
      </div>
    </div>
  );
}
