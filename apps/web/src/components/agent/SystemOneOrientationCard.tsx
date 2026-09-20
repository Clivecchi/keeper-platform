/**
 * Renders stored TypeSafe/Jev orientation from Lead orchestration.
 * This is evidence, not Lead prose and not a Cast prompt.
 */

import * as React from "react"
import {
  parseSystemOneOrientationView,
  type SystemOneOrientationView,
} from "@keeper/shared"

function formatNoul(value: number | null): string {
  return typeof value === "number" ? String(value) : "unavailable"
}

function formatProbabilities(value: Record<string, number> | null): string {
  if (!value) return "unavailable"
  return Object.entries(value)
    .map(([label, probability]) => `${label} ${probability}`)
    .join(" · ")
}

export function SystemOneOrientationCard({
  orchestration,
}: {
  orchestration?: Record<string, unknown>
}) {
  const view = React.useMemo(
    () => parseSystemOneOrientationView(orchestration),
    [orchestration],
  )
  if (!view) return null
  return <SystemOneOrientationBody view={view} />
}

function SystemOneOrientationBody({ view }: { view: SystemOneOrientationView }) {
  const audience =
    view.suppliedToCast === false
      ? view.suppliedToLead === true
        ? "Lead only — Cast did not see this."
        : "Stored on the Turn. Cast did not see this."
      : null

  return (
    <div
      className="mt-2 rounded-xl px-3 py-2 text-xs"
      style={{
        backgroundColor: "hsl(var(--theme-surface-paper))",
        color: "var(--theme-ink-primary-color)",
        border: "1px solid hsl(var(--theme-border-soft))",
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        System One orientation
      </div>
      {view.available ? (
        <ul className="mt-1 space-y-1">
          <li>
            <span className="opacity-70">Choice turnPosture</span>
            {": "}
            {view.turnPosture.choice ?? "unavailable"}
            {typeof view.turnPosture.confidence === "number"
              ? ` · confidence ${view.turnPosture.confidence}`
              : ""}
            {view.turnPosture.probabilities
              ? ` · ${formatProbabilities(view.turnPosture.probabilities)}`
              : ""}
          </li>
          <li>
            <span className="opacity-70">Noul reorganization</span>
            {`: ${formatNoul(view.documentReorganizationRequested.noul)}`}
          </li>
          <li>
            <span className="opacity-70">Noul mutation</span>
            {`: ${formatNoul(view.documentMutationRequested.noul)}`}
          </li>
          {view.model ? (
            <li className="opacity-70">Model {view.model}</li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-1">No System One result was available for this Turn.</p>
      )}
      {audience ? <p className="mt-1 opacity-60">{audience}</p> : null}
    </div>
  )
}

export function leadCardForSystemOne(
  card: { type: string; title: string; body?: string; meta?: string; items?: string[] } | undefined,
  orchestration?: Record<string, unknown>,
) {
  const view = parseSystemOneOrientationView(orchestration)
  if (
    view?.available
    && card
    && /system one orientation/i.test(card.title)
    && /no system one result was available/i.test(card.body ?? "")
  ) {
    return undefined
  }
  return card
}

export function leadContentForSystemOne(
  content: string,
  orchestration?: Record<string, unknown>,
): string {
  const view = parseSystemOneOrientationView(orchestration)
  if (!view?.available) return content
  return content
    .replace(/\n*No System One result was available to me for this Turn\.?\s*$/i, "")
    .trim()
}
