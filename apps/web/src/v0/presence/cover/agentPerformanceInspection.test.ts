import { describe, expect, it } from "vitest"
import { buildAgentPerformanceProvenance } from "@keeper/shared"
import { buildComposerInspectionContext, buildInspectionFacts } from "./agentPerformanceInspection"

describe("agentPerformanceInspection", () => {
  it("distinguishes recorded facts from current configured role", () => {
    const provenance = buildAgentPerformanceProvenance({
      source: "derived_from_legacy",
      agentId: "a1",
      agentSlug: "kip",
      agentName: "Kip",
      configuredRole: "Lead",
      dialogTitle: "Finding the Plot",
      orchestrationMechanism: "cast_consultation_a",
      cast: [{ slug: "cloud" }, { slug: "rendr" }, { slug: "ceox" }],
      cardType: "summary",
      leadJudgmentActive: false,
    })
    const facts = buildInspectionFacts(provenance, { name: "Kip", role: "Lead" })
    expect(facts.find((fact) => fact.label === "Acting as")?.value).toBe("Lead")
    expect(facts.find((fact) => fact.label === "Talking in")?.value).toBe("Finding the Plot")
    expect(facts.find((fact) => fact.label === "Cast")?.value).toMatch(/Cloud/)
    expect(facts.find((fact) => fact.label === "Expression emitted")?.value).toBe("Summary")
    expect(facts.find((fact) => fact.label === "Resolved Meaning")?.value).toBe("Absent")
  })

  it("grounds Composer with recorded layers only", () => {
    const provenance = buildAgentPerformanceProvenance({
      agentId: "a1",
      agentSlug: "kip",
      agentName: "Kip",
      configuredRole: "Lead",
      leadJudgmentActive: true,
      dialogTitle: "Finding the Plot",
    })
    const ctx = buildComposerInspectionContext({
      provenance,
      configuredName: "Kip",
      configuredRole: "Lead",
      instruction: "Inspect only.",
    })
    expect(ctx.instruction).toBe("Inspect only.")
    expect(ctx.actingRole).toBe("Lead")
    const layers = ctx.layers as Array<{ key: string; status: string }>
    expect(layers.find((layer) => layer.key === "lead_judgment")?.status).toBe("recorded")
  })
})
