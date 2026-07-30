import { describe, expect, it } from "vitest"
import {
  isEchoInternalPrompt,
  sanitizeUserMessageContent,
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
      "[Director delegation — Cloud on the IDE board]",
      "The user addressed Cloud (instrument pinned on the IDE board).",
      "Kip (Lead) relayed:",
      '"Please open the PR."',
      "",
      "Answer in first person as Cloud.",
    ].join("\n")
    expect(sanitizeUserMessageContent(raw)).toBe("Please open the PR.")
  })
})
