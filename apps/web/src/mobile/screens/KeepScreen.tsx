"use client";

import * as React from "react";
import { ChronicleActPresence } from "../../v0/presence/chronicleConfig/ChronicleActPresence";
import { useBoardEngagement } from "../../v0/boards/engagement/useBoardEngagement";
import type { EngagementContext } from "../../components/engagement/EngagementForm";
import { useMobileKeeper } from "../context/MobileKeeperContext";
import {
  fetchDomainJourneys,
  fetchDomainKeepers,
} from "../lib/mobileApi";
import type { MobileJourneySummary, MobileKeeperSummary } from "../types";

export function KeepScreen() {
  const {
    domainId,
    domainSlug,
    activeJourneyId,
    setActiveJourneyId,
    notifyMomentKept,
    setActiveTab,
    openMoment,
  } = useMobileKeeper();

  const [journeys, setJourneys] = React.useState<MobileJourneySummary[]>([]);
  const [keepers, setKeepers] = React.useState<MobileKeeperSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!domainId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [journeyList, keeperList] = await Promise.all([
          fetchDomainJourneys(domainId!),
          fetchDomainKeepers(domainId!),
        ]);
        if (cancelled) return;
        setJourneys(journeyList);
        setKeepers(keeperList);
        if (!activeJourneyId && journeyList[0]?.id) {
          setActiveJourneyId(journeyList[0].id);
        }
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
  }, [domainId, activeJourneyId, setActiveJourneyId]);

  const selectedJourney = journeys.find((j) => j.id === activeJourneyId) ?? journeys[0] ?? null;
  const keeperId =
    selectedJourney?.keeperId
    ?? keepers[0]?.id
    ?? null;

  const engagement = useBoardEngagement((result) => {
    notifyMomentKept();
    const createdId =
      typeof result?.data === "object"
      && result?.data
      && typeof (result.data as { moment?: { id?: unknown } }).moment?.id === "string"
        ? (result.data as { moment: { id: string } }).moment.id
        : null;

    if (createdId) {
      openMoment(createdId);
    } else {
      setActiveTab("world");
    }
  });

  React.useEffect(() => {
    if (!domainId || !selectedJourney?.id || !keeperId) return;

    const context: EngagementContext = {
      domainId,
      entityType: "journey",
      entityId: selectedJourney.id,
      journeyId: selectedJourney.id,
      keeperId,
    };

    void engagement.activateBySlug("moment.create", context);
  }, [domainId, selectedJourney?.id, keeperId, engagement.activateBySlug]);

  const handleSubmit = React.useCallback(
    async (inputs: Record<string, unknown>) => {
      setSubmitError(null);
      try {
        await engagement.handleSubmit(inputs);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Could not keep this moment");
      }
    },
    [engagement],
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
        Preparing to keep a moment…
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

  if (!selectedJourney || !keeperId) {
    return (
      <div className="px-4 py-8">
        <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Start a journey on desktop first, then you can keep moments to it from here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
      <div className="mb-4">
        <label
          htmlFor="mobile-journey-select"
          className="mb-1.5 block text-[11px] uppercase tracking-[0.18em]"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Journey
        </label>
        <select
          id="mobile-journey-select"
          value={selectedJourney.id}
          onChange={(event) => setActiveJourneyId(event.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          {journeys.map((journey) => (
            <option key={journey.id} value={journey.id}>
              {journey.name}
            </option>
          ))}
        </select>
      </div>

      {engagement.intent ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChronicleActPresence
            template={engagement.intent.template}
            context={engagement.intent.context}
            onSubmit={handleSubmit}
            onClose={() => engagement.cancel()}
            submitting={engagement.submitting}
            errorMessage={submitError}
          />
        </div>
      ) : (
        <div className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Loading keep form…
        </div>
      )}
    </div>
  );
}
