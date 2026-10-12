import { describe, expect, it } from "vitest"
import { isAbortError, turnAbortError } from "../../../lib/turnStop"
import { workElapsedLabel, workIsStalled, workVoiceName, WORK_STALL_MS } from "./dialogWork"

describe("dialog work copy", () => {
  it("names the voice in the live line", () => {
    expect(workVoiceName("Cloud is contributing…", "Kip")).toBe("Cloud")
    expect(workVoiceName("Hearing 3 offers…", "Kip")).toBe("Kip")
  })

  it("keeps the clock short", () => {
    expect(workElapsedLabel(4000)).toBe("4s")
    expect(workElapsedLabel(75_000)).toBe("1m 15s")
  })

  it("calls a step stalled after twenty seconds without a new line", () => {
    expect(workIsStalled(WORK_STALL_MS - 1)).toBe(false)
    expect(workIsStalled(WORK_STALL_MS)).toBe(true)
  })

  it("recognizes a stopped request", () => {
    expect(isAbortError(turnAbortError())).toBe(true)
    expect(isAbortError(new Error("network"))).toBe(false)
  })
})
