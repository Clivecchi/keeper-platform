"use client"

import type { CSSProperties } from "react"
import type { AgencyPlaceFacts, AgencyPlaceLayer } from "./agencyPlace"
import { AgencyRoomShell } from "./AgencyRoomShell"

export interface AgencyInspectPresenceProps {
  facts: AgencyPlaceFacts
  onBack: () => void
}

const quiet: CSSProperties = {
  color: "hsl(var(--theme-ink-secondary))",
}

function layerTone(status: string): string {
  if (status === "recorded") return "hsl(var(--theme-ink-primary))"
  return "hsl(var(--theme-ink-tertiary))"
}

function LayerRow({ layer }: { layer: AgencyPlaceLayer }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <p className="text-[13px]" style={{ color: layerTone(layer.status) }}>
        {layer.label}
      </p>
      <p
        className="text-[11px] uppercase tracking-wider shrink-0"
        style={{ color: layerTone(layer.status) }}
      >
        {layer.status === "recorded" ? "Recorded" : "Not recorded"}
      </p>
    </div>
  )
}

/**
 * Present inspection — operative machinery under Keeper's working Agency.
 * Missing facts stay missing.
 */
export function AgencyInspectPresence({ facts, onBack }: AgencyInspectPresenceProps) {
  const performance = facts.lastPerformance
  const heldOn = performance?.dialogTitle?.trim()

  return (
    <AgencyRoomShell title="Keeper's working Agency" status="Inspection" onBack={onBack}>
      <p className="text-[15px] leading-relaxed mb-6" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {heldOn
          ? `How this Domain is being led. Last held on ${heldOn}.`
          : "How this Domain is being led."}
      </p>

      <section className="mb-6">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))" }}
        >
          Lens
        </p>
        {facts.lens ? (
          <p className="text-sm" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {facts.lens.name}
            <span className="block text-[12px] mt-0.5" style={quiet}>
              {facts.lens.source === "domain"
                ? "This Domain's Lens"
                : "Platform default — this Domain has no Lens of its own"}
            </span>
          </p>
        ) : (
          <p className="text-sm" style={quiet}>
            No Lens is loaded for this Domain.
          </p>
        )}
      </section>

      <section className="mb-6">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))" }}
        >
          Contract
        </p>
        {facts.contract ? (
          <p className="text-sm" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {facts.contract.name} {facts.contract.version}
            <span className="block text-[12px] mt-0.5" style={quiet}>
              Enforcement {facts.contract.enforcementMode}
            </span>
          </p>
        ) : (
          <p className="text-sm" style={quiet}>
            No Domain Agent Policy is loaded.
          </p>
        )}
      </section>

      <section>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))" }}
        >
          Last recorded performance
        </p>
        {performance ? (
          <div>
            <p className="text-sm mb-2" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              {performance.dialogTitle}
              <span className="block text-[12px] mt-0.5" style={quiet}>
                {performance.agentName}
                {performance.recordedAt
                  ? ` · ${new Date(performance.recordedAt).toLocaleString()}`
                  : ""}
              </span>
            </p>
            {performance.layers.length > 0 ? (
              <div
                className="divide-y"
                style={{ borderColor: "hsl(var(--theme-border-soft) / 0.28)" }}
              >
                {performance.layers.map((layer) => (
                  <LayerRow key={layer.key} layer={layer} />
                ))}
              </div>
            ) : (
              <p className="text-sm" style={quiet}>
                This turn has no recorded provenance layers.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm" style={quiet}>
            No domain-scoped Lead performance is recorded yet.
          </p>
        )}
      </section>
    </AgencyRoomShell>
  )
}
