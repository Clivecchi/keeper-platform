"use client";

import * as React from "react";
import { Navigate } from "react-router-dom";
import { fetchDomainSwitcherEntries } from "../../v0/boards/domain/domainSwitcherData";

/**
 * Authenticated mobile entry at `/realms` — resolves first domain and lands on
 * Universal Mobile Shell with `?board=realm` (Dialog tab is the default home tab).
 */
export function RealmsRedirect() {
  const [target, setTarget] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchDomainSwitcherEntries()
      .then((entries) => {
        if (cancelled) return;
        const slug = entries[0]?.slug ?? "default";
        setTarget(`/d/${encodeURIComponent(slug)}/board?board=realm`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <Navigate to="/d/default/board?board=realm" replace />;
  }

  if (!target) {
    return (
      <div
        className="flex h-[100dvh] items-center justify-center text-sm"
        style={{ color: "hsl(var(--theme-ink-secondary, 0 0% 45%))" }}
      >
        Loading your domains…
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
