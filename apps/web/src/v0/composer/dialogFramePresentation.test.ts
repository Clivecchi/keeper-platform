// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { FramePerformance } from "@keeper/shared"
import { dialogSurfaceFrame } from "./dialogFramePresentation"

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
