// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { FramePerformance } from "@keeper/shared"
import { dialogSurfaceFrame, dialogTurnSurface } from "./dialogFramePresentation"

const telling: FramePerformance = {
  version: 1,
  title: "One holding",
  beats: [
    { title: "Still talking", body: "The reply stays a reply." },
    { title: "The holding", body: "This beat belongs in the story.", promote: true },
  ],
}

describe("dialogSurfaceFrame", () => {
  it("leaves an unpromoted agent turn as conversation", () => {
    const unpromoted: FramePerformance = {
      ...telling,
      beats: telling.beats.map((beat) => ({ title: beat.title, body: beat.body })),
    }
    expect(dialogSurfaceFrame({
      messages: [{ id: "m1", role: "agent", framePerformance: unpromoted }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: false,
    })).toBeNull()
  })

  it("gives a promoted beat the Dialog surface", () => {
    const surface = dialogSurfaceFrame({
      messages: [
        { id: "u1", role: "user" },
        { id: "m1", role: "agent", framePerformance: telling },
      ],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: false,
    })
    expect(surface?.messageId).toBe("m1")
    expect(surface?.performance.beats.map((beat) => beat.title)).toEqual(["The holding"])
  })

  it("returns to conversation when dismissed, while sending, on Stage, or after the human speaks", () => {
    const base = {
      messages: [{ id: "m1", role: "agent" as const, framePerformance: telling }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: false,
    }
    expect(dialogSurfaceFrame({ ...base, dismissedMessageId: "m1" })).toBeNull()
    expect(dialogSurfaceFrame({ ...base, isSending: true })).toBeNull()
    expect(dialogSurfaceFrame({ ...base, stageOwnsSurface: true })).toBeNull()
    expect(dialogSurfaceFrame({
      ...base,
      messages: [...base.messages, { id: "u2", role: "user" }],
    })).toBeNull()
  })
})

describe("dialogTurnSurface", () => {
  it("puts the work in the Dialog Frame while the turn runs, including on Stage", () => {
    expect(dialogTurnSurface({
      messages: [{ id: "u1", role: "user", content: "Show me" }],
      dismissedMessageId: null,
      isSending: true,
      stageOwnsSurface: true,
      holdOutput: false,
    })).toEqual({ kind: "work" })
  })

  it("leaves a promoted frame to the Stage canvas", () => {
    expect(dialogTurnSurface({
      messages: [{ id: "m1", role: "agent", content: "Done.", framePerformance: telling }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: true,
      holdOutput: true,
    })).toBeNull()
  })

  it("reopens an earlier frame after later talk", () => {
    const surface = dialogTurnSurface({
      messages: [
        { id: "m1", role: "agent", framePerformance: telling },
        { id: "u2", role: "user", content: "Continue." },
        { id: "m2", role: "agent", content: "Still talking." },
      ],
      dismissedMessageId: null,
      openedMessageId: "m1",
      isSending: false,
      stageOwnsSurface: false,
      holdOutput: false,
    })
    expect(surface?.kind).toBe("frame")
    if (surface?.kind === "frame") {
      expect(surface.messageId).toBe("m1")
      expect(surface.performance.beats).toHaveLength(1)
    }
  })

  it("replaces the work with the reply when Stage has no promoted frame", () => {
    expect(dialogTurnSurface({
      messages: [{ id: "m1", role: "agent", content: "The change is in the room." }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: true,
      holdOutput: true,
    })).toEqual({
      kind: "reply",
      messageId: "m1",
      text: "The change is in the room.",
    })
  })

  it("keeps a laid-out filmstrip on Stage when a later reply arrives", () => {
    expect(dialogTurnSurface({
      messages: [{ id: "m1", role: "agent", content: "The story is **named**.\n\n```keeper-card\n{}\n```" }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: true,
      holdOutput: true,
      filmstripCoversStage: true,
    })).toBeNull()
  })

  it("leaves the Stage cover up when this turn is not the one just finished", () => {
    expect(dialogTurnSurface({
      messages: [{ id: "m1", role: "agent", content: "Older reply.", framePerformance: telling }],
      dismissedMessageId: null,
      isSending: false,
      stageOwnsSurface: true,
      holdOutput: false,
    })).toBeNull()
  })
})
