import { describe, expect, it } from "vitest"
import {
  annotateCastActionResults,
  buildDomainCollaborationPrompt,
  extractActionResultsFromRunResult,
  extractAgentReplyFromRunResult,
  isEchoInternalPrompt,
  mergeCastAndLeadActionResults,
  sanitizeUserMessageContent,
  sanitizeAgentMessageContent,
  shouldAttachEcho,
} from "./directorDialog"

describe("sanitizeUserMessageContent — Echo / collaboration scaffolds", () => {
  it("hides Agent Echo supporting-role prompts", () => {
    const raw = [
      "[Agent Echo — supporting role]",
      'The user asked: "What is a Path?"',
      'Cloud responded: "A Path is a thread of Moments."',
      "",
      "You are in the supporting role. Do NOT answer the user's question.",
    ].join("\n")
    expect(isEchoInternalPrompt(raw)).toBe(true)
    expect(sanitizeUserMessageContent(raw)).toBe("")
  })

  it("hides Platform collaboration prompts", () => {
    const raw = [
      "[Platform collaboration — Kip]",
      'The user asked: "How do Domains work?"',
      "Ceox (domain lead) responded: \"Each Domain has a lead.\"",
      "",
      "You are Keeper platform support — not the lead voice.",
    ].join("\n")
    expect(isEchoInternalPrompt(raw)).toBe(true)
    expect(sanitizeUserMessageContent(raw)).toBe("")
  })

  it("leaves ordinary user messages unchanged", () => {
    expect(sanitizeUserMessageContent("What is a Path?")).toBe("What is a Path?")
  })

  it("still recovers quoted text from Director prompts", () => {
    const raw = [
      "[Director delegation — Cloud on the Build board]",
      "The user addressed Cloud (instrument pinned on the Build board).",
      "Kip (Lead) relayed:",
      '"Please open the PR."',
      "",
      "Answer in first person as Cloud.",
    ].join("\n")
    expect(sanitizeUserMessageContent(raw)).toBe("Please open the PR.")
  })
})

describe("cast-consult action-result extract", () => {
  it("extracts actions from nested runAgent envelope (not just reply text)", () => {
    const result = {
      success: true,
      data: {
        data: {
          response: "I proposed a warmer Treatment.",
          actions: [
            {
              type: "treatment.propose",
              status: "success",
              message: "Proposed Treatment — tap Apply to update Chronicle",
              data: { proposal: { name: "Warm" } },
            },
          ],
        },
      },
    }
    expect(extractAgentReplyFromRunResult(result)).toBe("I proposed a warmer Treatment.")
    expect(extractActionResultsFromRunResult(result)).toHaveLength(1)
    expect((extractActionResultsFromRunResult(result)[0] as { type: string }).type).toBe(
      "treatment.propose",
    )
  })

  it("annotates cast receipts with attribution for compact UI", () => {
    const annotated = annotateCastActionResults(
      [{ type: "draft.update.propose", status: "error", message: "Point content is required" }],
      { castSlug: "rendr", attributedTo: "Rendr" },
    )
    expect(annotated).toEqual([
      {
        type: "draft.update.propose",
        status: "error",
        message: "Point content is required",
        data: { castSlug: "rendr", attributedTo: "Rendr" },
      },
    ])
  })

  it("extracts actions from KipApi AgentResponse envelope (success → data → data.actions)", () => {
    const kipApiReturn = {
      id: "agent-1",
      success: true,
      data: {
        action: "system_interaction",
        type: "conversation",
        data: {
          response: "Saved a memory anchor.",
          actions: [
            {
              type: "sole.save",
              status: "success",
              message: "Memory saved: Generation Keeper",
              data: { memoryCard: { id: "m1", topic: "Generation Keeper" } },
            },
          ],
        },
      },
      processing_time_ms: 12,
    }
    expect(extractActionResultsFromRunResult(kipApiReturn)).toHaveLength(1)
    expect((extractActionResultsFromRunResult(kipApiReturn)[0] as { type: string }).type).toBe(
      "sole.save",
    )
  })

  it("merges client cast receipts when Lead response omitted castSlug tags", () => {
    const cast = annotateCastActionResults(
      [{ type: "treatment.propose", status: "success", message: "Proposed Treatment" }],
      { castSlug: "rendr", attributedTo: "Rendr" },
    )
    const lead = [{ type: "sole.save", status: "success", message: "Memory saved" }]
    const merged = mergeCastAndLeadActionResults(lead, cast)
    expect(merged).toHaveLength(2)
    expect((merged?.[0] as { data?: { castSlug?: string } }).data?.castSlug).toBe("rendr")
  })

  it("revives treatment.proposal from client when Lead fold dropped nested data", () => {
    const lead = [
      {
        type: "treatment.propose",
        status: "success",
        message: "Proposed Treatment — tap Apply to update Chronicle",
        data: { castSlug: "rendr", attributedTo: "Rendr" },
      },
    ]
    const cast = annotateCastActionResults(
      [
        {
          type: "treatment.propose",
          status: "success",
          message: "Proposed Treatment — tap Apply to update Chronicle",
          data: {
            summary: "Warm parchment · teal accent · Georgia",
            proposal: {
              name: "Archival",
              palette: { background: "#f5f0e8", accent: "#2d6a7f" },
              font: { family: "Georgia, serif" },
            },
          },
        },
      ],
      { castSlug: "rendr", attributedTo: "Rendr" },
    )
    const merged = mergeCastAndLeadActionResults(lead, cast)
    expect(merged).toHaveLength(1)
    const data = (merged?.[0] as { data?: { proposal?: { name?: string } } }).data
    expect(data?.proposal?.name).toBe("Archival")
  })

  it("keeps Lead cast receipt when it already has the richer payload", () => {
    const lead = [
      {
        type: "treatment.propose",
        status: "error",
        message: "Invalid palette",
        data: {
          castSlug: "rendr",
          attributedTo: "Rendr",
          proposal: { name: "From Lead" },
          summary: "lead",
        },
      },
    ]
    const cast = annotateCastActionResults(
      [{ type: "treatment.propose", status: "success", message: "stale client copy" }],
      { castSlug: "rendr", attributedTo: "Rendr" },
    )
    expect(mergeCastAndLeadActionResults(lead, cast)).toEqual(lead)
  })

  it("falls back to cast-only receipts when Lead returned none", () => {
    const cast = annotateCastActionResults(
      [{ type: "draft.create", status: "success", message: "Created draft" }],
      { castSlug: "cloud", attributedTo: "Cloud" },
    )
    expect(mergeCastAndLeadActionResults(undefined, cast)).toEqual(cast)
    expect(mergeCastAndLeadActionResults([], cast)).toEqual(cast)
  })
})

describe("shouldAttachEcho", () => {
  it("attaches only ok replies with substance", () => {
    expect(shouldAttachEcho({ content: "Platform note: Dialog is the conversation.", status: "ok" })).toBe(true)
  })

  it("keeps empty and failed offstage", () => {
    expect(shouldAttachEcho({ content: "", status: "empty" })).toBe(false)
    expect(shouldAttachEcho({ content: "", status: "failed" })).toBe(false)
    expect(shouldAttachEcho({ content: "Cloud did not respond this turn.", status: "ok" })).toBe(false)
  })
})

describe("buildDomainCollaborationPrompt", () => {
  it("defaults to silence and forbids Document writes", () => {
    const prompt = buildDomainCollaborationPrompt({
      userMessage: "Let's launch a new surface.",
      leadName: "Ceox",
      leadReply: "What's the occasion?",
    })
    expect(isEchoInternalPrompt(prompt)).toBe(true)
    expect(prompt).toContain("Default: return empty")
    expect(prompt).toContain("Do NOT create drafts")
    expect(prompt).not.toContain("draft.create")
  })
})

describe("sanitizeAgentMessageContent", () => {
  it("extracts the response from a leaked agent_output envelope", () => {
    const raw = JSON.stringify({
      type: "agent_output",
      response: "This is the Community Commerce model from 2019.",
      card: { type: "info", title: "Community Commerce" },
    })
    expect(sanitizeAgentMessageContent(raw)).toBe("This is the Community Commerce model from 2019.")
  })
})
