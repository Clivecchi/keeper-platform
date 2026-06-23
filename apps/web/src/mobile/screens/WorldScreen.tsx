"use client";

import * as React from "react";
import { MomentListCard } from "../components/MomentListCard";
import { useMobileKeeper } from "../context/MobileKeeperContext";
import { fetchKeptMomentsForWorld } from "../lib/mobileApi";
import type { KeptMomentSummary } from "../../v0/api/v0Moments";

export function WorldScreen() {
  const { domainSlug, worldRefreshKey, openMoment } = useMobileKeeper();
  const [moments, setMoments] = React.useState<KeptMomentSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchKeptMomentsForWorld({ domainSlug, limit: 50 });
        if (!cancelled) setMoments(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your world");
          setMoments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [domainSlug, worldRefreshKey]);

  if (loading) {
    return (
      <div className="px-4 py-6 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading your kept moments…
      </div>
    );
  }

  if (error) {
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
    <div className="space-y-3 px-4 py-4">
      {moments.map((moment) => (
        <MomentListCard key={moment.id} moment={moment} onOpen={openMoment} />
      ))}
    </div>
  );
}
