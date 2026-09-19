import type { AgentPerformanceProvenance } from "@keeper/shared"
import { mechanismLabel } from "@keeper/shared"

export interface AgentPerformanceRow {
  messageId: string
  sessionId: string
  createdAt: string
  preview: string
  provenance: AgentPerformanceProvenance
  card?: { type?: string } | null
}

export interface AgentPerformancesResponse {
  agent: { id: string; slug: string; name: string; role: string }
  dialog: { id: string; title: string; domainId: string }
  performances: AgentPerformanceRow[]
}

export type InspectionFactTone = "recorded" | "not_recorded" | "configured"

export interface InspectionFact {
  label: string
  value: string
  tone: InspectionFactTone
}

export function formatCastLine(provenance: AgentPerformanceProvenance): string {
  if (provenance.cast.length === 0) {
    return "Not recorded for this performance"
  }
  return provenance.cast
    .map((row) => row.attributedTo?.trim() || titleCaseSlug(row.slug))
    .join(" · ")
}

export function titleCaseSlug(slug: string): string {
  const trimmed = slug.trim()
  if (!trimmed) return "—"
  return trimmed.slice(0, 1).toUpperCase() + trimmed.slice(1)
}

export function formatLayerStatus(status: "recorded" | "not_recorded"): string {
  return status === "recorded" ? "Recorded on this turn" : "Not recorded for this performance"
}

export function buildInspectionFacts(
  provenance: AgentPerformanceProvenance,
  configured: { name: string; role: string | null },
): InspectionFact[] {
  const acting = provenance.actingRole || "Not recorded for this performance"
  const talkingIn = provenance.dialogTitle?.trim() || "Not recorded for this performance"
  const domain = provenance.domainName?.trim() || "Not recorded for this performance"
  const environment = [provenance.boardId, provenance.cueingMode, provenance.workspaceSurface]
    .filter(Boolean)
    .join(" · ")
  const modelBits = [
    provenance.modelProvider,
    provenance.model,
    provenance.offeringId,
    provenance.fallbackUsed ? "fallback used" : null,
  ].filter(Boolean).join(" / ")

  return [
    {
      label: "Agent",
      value: provenance.agentName || configured.name,
      tone: "recorded",
    },
    {
      label: "Configured role",
      value: configured.role?.trim() || "Not recorded for this performance",
      tone: configured.role ? "configured" : "not_recorded",
    },
    {
      label: "Acting as",
      value: acting,
      tone: provenance.actingRole ? "recorded" : "not_recorded",
    },
    {
      label: "Talking in",
      value: talkingIn,
      tone: provenance.dialogTitle ? "recorded" : "not_recorded",
    },
    {
      label: "Domain",
      value: domain,
      tone: provenance.domainName ? "recorded" : "not_recorded",
    },
    {
      label: "Environment",
      value: environment || "Not recorded for this performance",
      tone: environment ? "recorded" : "not_recorded",
    },
    {
      label: "Cast",
      value: formatCastLine(provenance),
      tone: provenance.cast.length ? "recorded" : "not_recorded",
    },
    {
      label: "Orchestration",
      value: mechanismLabel(provenance.orchestrationMechanism),
      tone: provenance.orchestrationMechanism ? "recorded" : "not_recorded",
    },
    {
      label: "Model",
      value: modelBits || "Not recorded for this performance",
      tone: modelBits ? "recorded" : "not_recorded",
    },
    {
      label: "Expression emitted",
      value: provenance.cardType
        ? titleCaseSlug(provenance.cardType)
        : "Not recorded for this performance",
      tone: provenance.cardType ? "recorded" : "not_recorded",
    },
    {
      label: "Resolved Meaning",
      value: provenance.resolvedMeaningPresent ? "Present" : "Absent",
      tone: provenance.resolvedMeaningPresent ? "recorded" : "not_recorded",
    },
  ]
}

export function buildComposerInspectionContext(params: {
  provenance: AgentPerformanceProvenance
  configuredName: string
  configuredRole: string | null
  instruction: string
}): Record<string, unknown> {
  const facts = buildInspectionFacts(params.provenance, {
    name: params.configuredName,
    role: params.configuredRole,
  })
  return {
    agentId: params.provenance.agentId,
    agentName: params.provenance.agentName,
    configuredRole: params.configuredRole,
    actingRole: params.provenance.actingRole,
    dialogId: params.provenance.dialogId,
    dialogTitle: params.provenance.dialogTitle,
    messageId: params.provenance.messageId ?? null,
    source: params.provenance.source,
    facts: facts.map((fact) => ({
      label: fact.label,
      value: fact.value,
      recorded: fact.tone === "recorded",
    })),
    layers: params.provenance.layers.map((layer) => ({
      key: layer.key,
      label: layer.label,
      status: layer.status,
      detail: layer.detail ?? null,
    })),
    instruction: params.instruction,
  }
}
