"use client";

import * as React from "react";
import { useAuth } from "../../context/AuthContext";
import { normalizeActionReceipt } from "../../components/agent/types";
import { KeeperDialogFrame } from "../../v0/components/dialog/KeeperDialogFrame";
import { useAgentDialog } from "../../hooks/useAgentDialog";
import { useV0Shell } from "../../v0/shell/V0ShellContext";
import { getApiBase } from "../../lib/apiFetch";
import { apiFetch } from "../../lib/api";
import { useUniversalMobile } from "../hooks/useUniversalMobile";
import { fetchMomentDetail } from "../lib/mobileApi";

export function KipScreen() {
  const {
    domainSlug,
    domainId,
    domainName,
    activeJourneyId,
    kipFocusMomentId,
    clearKipFocus,
    openMoment,
    notifyMomentKept,
    worldRefreshKey,
  } = useUniversalMobile();
  const { domainFrame, resolvedAudience } = useV0Shell();
  const { refreshSession, user } = useAuth();
  const [journeyCount, setJourneyCount] = React.useState<number | null>(null);
  const [momentCount, setMomentCount] = React.useState<number | null>(null);
  const [focusMomentTitle, setFocusMomentTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!kipFocusMomentId) {
      setFocusMomentTitle(null);
      return;
    }
    let cancelled = false;
    void fetchMomentDetail(kipFocusMomentId)
      .then((detail) => {
        if (!cancelled) setFocusMomentTitle(detail.title || "Untitled moment");
      })
      .catch(() => {
        if (!cancelled) setFocusMomentTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [kipFocusMomentId]);

  const agentContext = React.useMemo(() => {
    if (!domainFrame) return undefined;
    const audience = resolvedAudience ?? "keeper";
    const base = {
      audience,
      model: domainFrame.kip.model,
      forward: domainFrame.forward,
      directions: domainFrame.directions.filter((d) => d.available_to.includes(audience)),
      kip_context: domainFrame.kip_context[audience] ?? "",
    };
    if (!kipFocusMomentId) return base;
    return {
      ...base,
      focusMomentId: kipFocusMomentId,
      focusMomentTitle: focusMomentTitle ?? undefined,
    };
  }, [domainFrame, resolvedAudience, kipFocusMomentId, focusMomentTitle]);

  const {
    messages,
    input,
    setInput,
    isSending,
    error,
    thinkingSteps,
    agentId,
    activeSessionId,
    sendMessage,
  } = useAgentDialog({
    agentSlug: "kip",
    agentDisplayName: "Kip",
    mode: "domain",
    domainSlug,
    domainId,
    activeJourneyId,
    agentContext,
    resolvedAudience,
    refreshSession,
    userId: user?.id ?? null,
    onAfterAgentRun: (_latestRaw, actionResults) => {
      if (!Array.isArray(actionResults)) return;
      for (const ar of actionResults) {
        const receipt = normalizeActionReceipt(
          ar as Parameters<typeof normalizeActionReceipt>[0],
        );
        if (receipt.status !== "success") continue;
        const moment = receipt.data?.moment as { id?: string } | undefined;
        if (
          moment?.id
          && (receipt.type === "moment.create"
            || receipt.type === "moment.keep"
            || receipt.type === "moment.capture")
        ) {
          notifyMomentKept();
          openMoment(moment.id);
          return;
        }
      }
    },
  });

  React.useEffect(() => {
    if (!domainSlug) return;
    let cancelled = false;
    const base = getApiBase();
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: unknown[] }) => {
        if (!cancelled) {
          setJourneyCount(Array.isArray(json?.journeys) ? json.journeys.length : 0);
        }
      })
      .catch(() => {
        if (!cancelled) setJourneyCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [domainSlug]);

  React.useEffect(() => {
    if (!domainSlug) return;
    let cancelled = false;
    void apiFetch(`/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=500`)
      .then((json: unknown) => {
        if (cancelled) return;
        const n = Array.isArray((json as { data?: unknown[] })?.data)
          ? (json as { data: unknown[] }).data.length
          : 0;
        setMomentCount(n >= 500 ? 500 : n);
      })
      .catch(() => {
        if (!cancelled) setMomentCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [domainSlug, worldRefreshKey]);

  const bannerContext = React.useMemo(() => {
    const df = domainFrame as {
      theme?: { wordmark?: string; tagline?: string; colors?: { primary?: string } };
      cover?: { card?: { tagLine?: string } };
    } | null;
    const wordmark = df?.theme?.wordmark?.trim() || domainName || "Domain";
    const tagline = df?.cover?.card?.tagLine?.trim() || df?.theme?.tagline?.trim() || undefined;
    const primaryAccent = df?.theme?.colors?.primary?.trim() || undefined;
    const statJourneys = journeyCount === null ? "—" : String(journeyCount);
    const statMoments = momentCount === null ? "—" : momentCount >= 500 ? "500+" : String(momentCount);

    return {
      primary: wordmark,
      ...(tagline ? { tagline } : {}),
      livePulse: { color: primaryAccent },
      stats: [
        { label: "Journeys", value: statJourneys },
        { label: "Moments", value: statMoments },
      ] as const,
      ...(kipFocusMomentId && focusMomentTitle
        ? { secondary: `Moment · ${focusMomentTitle}` }
        : {}),
    };
  }, [domainFrame, domainName, journeyCount, momentCount, kipFocusMomentId, focusMomentTitle]);

  return (
    <div className="mobile-kip-screen">
      {kipFocusMomentId ? (
        <div className="mobile-kip-focus-bar">
          <p className="truncate text-xs" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Focused on {focusMomentTitle ?? "this moment"}
          </p>
          <button
            type="button"
            onClick={clearKipFocus}
            className="shrink-0 text-xs underline"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Clear focus
          </button>
        </div>
      ) : null}

      <div className="mobile-kip-dialog">
        <KeeperDialogFrame
          bannerContext={bannerContext}
          messages={messages}
          inputValue={input}
          onInputChange={setInput}
          onSubmit={sendMessage}
          isSending={isSending}
          error={error}
          thinkingSteps={thinkingSteps}
          agentId={agentId}
          domainId={domainId}
          activeSessionId={activeSessionId}
          dialogueMode="domain"
          agentName="Kip"
          onOpenMoment={openMoment}
          showServiceBar={false}
        />
      </div>
    </div>
  );
}
