"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchDomainSwitcherEntries,
  type DomainSwitcherEntry,
} from "../../v0/boards/domain/domainSwitcherData";
import { DomainAddPanel } from "../../v0/boards/domain/DomainAddPanel";
import { PlaybillCard } from "../../v0/components/PlaybillCard";
import { useTalkMode } from "../../hooks/useTalkMode";
import { buildDomainBoardPath } from "../../v0/shell/shellMode";
import { useUniversalMobile } from "../hooks/useUniversalMobile";

type RealmFetchState = "idle" | "loading" | "ready" | "error";
type RealmView = "list" | "add";

/** Target workspace when entering a domain from the Domains picker. */
const DOMAIN_ENTRY_BOARD = "domain" as const;

function buildDomainEntryPath(slug: string): string {
  return buildDomainBoardPath(slug, DOMAIN_ENTRY_BOARD);
}

export function RealmScreen() {
  const navigate = useNavigate();
  const { domainSlug, setActiveTab, submitMobileComposerText } = useUniversalMobile();

  const [fetchState, setFetchState] = React.useState<RealmFetchState>("idle");
  const [domains, setDomains] = React.useState<DomainSwitcherEntry[]>([]);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<RealmView>("list");
  const [composerText, setComposerText] = React.useState("");

  const mergeTalkTranscript = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setComposerText((prev) => {
      const existing = prev.trim();
      return existing ? `${existing} ${trimmed}` : trimmed;
    });
  }, []);

  const {
    state: talkState,
    isSupported: talkSupported,
    startListening,
    stopListening,
    error: talkError,
  } = useTalkMode({ onTranscript: mergeTalkTranscript });

  const isTalkListening = talkState === "listening";
  const isTalkBusy = talkState === "listening" || talkState === "transcribing";

  const handleTalkClick = React.useCallback(() => {
    if (!talkSupported) return;
    if (isTalkListening) stopListening();
    else startListening();
  }, [isTalkListening, startListening, stopListening, talkSupported]);

  const loadDomains = React.useCallback(() => {
    setFetchState("loading");
    setFetchError(null);
    fetchDomainSwitcherEntries()
      .then((entries) => {
        setDomains(entries);
        setFetchState("ready");
      })
      .catch((error: unknown) => {
        console.error("[RealmScreen] Failed to load domains:", error);
        setFetchError(error instanceof Error ? error.message : "Could not load your domains.");
        setFetchState("error");
      });
  }, []);

  React.useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  const handleSelectDomain = React.useCallback(
    (slug: string) => {
      navigate(buildDomainEntryPath(slug));
    },
    [navigate],
  );

  const handleDomainCreated = React.useCallback(
    (slug: string) => {
      setView("list");
      navigate(buildDomainEntryPath(slug));
    },
    [navigate],
  );

  const handleSend = React.useCallback(() => {
    const trimmed = composerText.trim();
    if (!trimmed) return;
    submitMobileComposerText(trimmed);
    setComposerText("");
    setActiveTab("kip");
  }, [composerText, setActiveTab, submitMobileComposerText]);

  const handleComposerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="mobile-realm-screen flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mobile-screen-scroll flex-1 px-4 py-4">
        <div className="mb-4">
          <p
            className="text-[11px] uppercase tracking-[0.22em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Your Domains
          </p>
          <p className="mt-1 text-xs" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Tap an innkeeper to enter their domain — capture and talk from there.
          </p>
        </div>

        {fetchState === "loading" ? (
          <p className="py-6 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Loading your domains…
          </p>
        ) : null}

        {fetchState === "error" ? (
          <div className="py-6">
            <p className="text-sm" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
              {fetchError ?? "Could not load your domains."}
            </p>
            <button
              type="button"
              onClick={loadDomains}
              className="mt-3 text-sm underline underline-offset-2"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              Try again
            </button>
          </div>
        ) : null}

        {fetchState === "ready" && domains.length === 0 ? (
          <div className="py-6">
            <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              No domains yet. Add one to begin keeping what matters.
            </p>
          </div>
        ) : null}

        {fetchState === "ready" && domains.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {domains.map((domain) => (
              <li key={domain.slug}>
                <PlaybillCard
                  domain={domain}
                  isCurrent={domain.slug === domainSlug}
                  onSelect={handleSelectDomain}
                  variant="realm"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {fetchState === "ready" ? (
          <button
            type="button"
            onClick={() => setView("add")}
            className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left transition-opacity hover:opacity-80"
            style={{
              border: "1px dashed hsl(var(--theme-border-soft) / 0.7)",
              background: "hsl(var(--theme-surface-panel) / 0.45)",
            }}
            aria-label="Add a domain"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                border: "1px solid hsl(var(--theme-border-soft) / 0.7)",
                color: "hsl(var(--theme-ink-secondary))",
              }}
              aria-hidden
            >
              <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
                <path
                  d="M4 1.5V6.5M1.5 4H6.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="text-sm font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              Add a domain
            </span>
          </button>
        ) : null}
      </div>

      <div
        className="mobile-realm-composer shrink-0 px-3 pt-2 pb-3"
        style={{
          borderTop: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%) / 0.96)",
        }}
      >
        <div className="flex items-end gap-2">
          {talkSupported ? (
            <button
              type="button"
              onClick={handleTalkClick}
              disabled={talkState === "transcribing"}
              className={[
                "mobile-realm-mic-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-50",
                isTalkListening ? "mobile-realm-mic-btn--active" : "",
              ].join(" ")}
              style={{
                border: isTalkListening
                  ? "1.5px solid hsl(var(--theme-focus-ring))"
                  : "1px solid hsl(var(--theme-border-soft) / 0.55)",
                color: isTalkListening
                  ? "hsl(var(--theme-focus-ring))"
                  : "hsl(var(--theme-ink-secondary))",
              }}
              aria-label={isTalkListening ? "Stop listening" : "Talk — speak to fill the composer"}
              aria-pressed={isTalkListening}
              title={isTalkListening ? "Stop listening" : "Talk — speak to fill the composer"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            <span
              className="mobile-realm-mic-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full opacity-40"
              style={{
                border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
                color: "hsl(var(--theme-ink-secondary))",
              }}
              title="Speech recognition is not supported in this browser"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0M12 18v3M8 21h8"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}

          <div
            className="flex min-w-0 flex-1 items-end gap-2 rounded-2xl px-3 py-2"
            style={{
              border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
              background: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
            }}
          >
            <textarea
              value={composerText}
              onChange={(event) => setComposerText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              placeholder="Say or type what matters…"
              className="max-h-24 min-h-[1.5rem] w-full resize-none bg-transparent text-sm outline-none"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
              aria-label="Capture message"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!composerText.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-35"
              style={{
                background: "#6ee7b7",
                color: "hsl(220 18% 10%)",
              }}
              aria-label="Send to Kip"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 19V5M12 5l-6 6M12 5l6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        {isTalkBusy || talkError ? (
          <p
            className="mt-2 px-1 text-xs"
            style={{ color: talkError ? "hsl(var(--theme-status-error, 0 72% 51%))" : "hsl(var(--theme-ink-secondary))" }}
            aria-live="polite"
          >
            {talkError
              ? talkError
              : talkState === "listening"
                ? "Listening… tap mic when done, then send."
                : "Transcribing…"}
          </p>
        ) : null}
      </div>

      {view === "add" ? (
        <DomainAddPanel
          onClose={() => setView("list")}
          onBack={() => setView("list")}
          onCreated={handleDomainCreated}
        />
      ) : null}
    </div>
  );
}
