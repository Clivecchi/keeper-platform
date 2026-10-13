import { describe, expect, it } from "vitest"
import { isAbortError, turnAbortError } from "../../../lib/turnStop"
import {
  directedWorkLabel,
  workElapsedLabel,
  workIsStalled,
  workProgress,
  workStatusLine,
  workVoiceName,
  WORK_STALL_MS,
} from "./dialogWork"

describe("dialog work copy", () => {
  it("names the voice in the live line", () => {
    expect(workVoiceName("Cloud is contributing…", "Kip")).toBe("Cloud")
    expect(workVoiceName("Cloud — verify where the Slide bodies live", "Kip")).toBe("Cloud")
    expect(workVoiceName("Hearing 3 offers…", "Kip")).toBe("Kip")
  })

  it("keeps a status line to one aim", () => {
    expect(workStatusLine("Cloud", "verify where the Slide bodies live")).toBe(
      "Cloud — verify where the Slide bodies live",
    )
    expect(workStatusLine("Cloud", "x".repeat(200)).length).toBeLessThanOrEqual("Cloud — ".length + 140)
  })

  it("shows the current aim and only the three lines before it", () => {
    const progress = workProgress(
      [
        { label: "Received your message" },
        { label: "Hearing 4 offers…" },
        { label: "Kip is choosing who speaks…" },
        { label: "Rendr — read the five slides" },
        { label: "Rendr — the original five slides are still the only copy" },
        { label: "Cloud — verify where the Slide bodies live" },
      ],
      "Cloud — verify where the Slide bodies live",
    )
    expect(progress.voice).toBe("Cloud")
    expect(progress.now).toContain("Slide bodies")
    expect(progress.earlier).toEqual([
      "Kip is choosing who speaks…",
      "Rendr — read the five slides",
      "Rendr — the original five slides are still the only copy",
    ])
    expect(progress.earlier.join(" ")).not.toContain("Received your message")
  })

  it("keeps the clock short", () => {
    expect(workElapsedLabel(4000)).toBe("4s")
    expect(workElapsedLabel(75_000)).toBe("1m 15s")
  })

  it("calls a step stalled after twenty seconds without a new line", () => {
    expect(workIsStalled(WORK_STALL_MS - 1)).toBe(false)
    expect(workIsStalled(WORK_STALL_MS)).toBe(true)
  })

  it("does not name the highlighted cast chip while the room is open", () => {
    expect(directedWorkLabel({
      directed: true,
      sending: true,
      phase: "cast",
      leadName: "Kip",
    })).toBeUndefined()
    expect(directedWorkLabel({
      directed: true,
      sending: true,
      phase: "director",
      leadName: "Kip",
    })).toBe("Kip is thinking…")
  })

  it("recognizes a stopped request", () => {
    expect(isAbortError(turnAbortError())).toBe(true)
    expect(isAbortError(new Error("network"))).toBe(false)
  })
})
