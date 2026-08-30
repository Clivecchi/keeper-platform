// @vitest-environment node
import { describe, expect, it } from "vitest"
import { displayStageTitle, resolveStageNowBeat } from "./stageNowBeat"

describe("resolveStageNowBeat", () => {
  const names = { userName: "Chuck", agentName: "Kip" }

  it("takes the last human Turn and the reply after it", () => {
    const beat = resolveStageNowBeat(
      [
        { role: "user", content: "older" },
        { role: "agent", content: "older reply" },
        { role: "user", content: "Where is the story seen?" },
        { role: "agent", content: "On Stage, as the current beat." },
      ],
      names,
    )
    expect(beat.you).toEqual({ name: "Chuck", text: "Where is the story seen?" })
    expect(beat.answer).toEqual({ name: "Kip", text: "On Stage, as the current beat." })
  })

  it("keeps the human line while waiting and does not reuse an older reply", () => {
    const beat = resolveStageNowBeat(
      [
        { role: "user", content: "older" },
        { role: "agent", content: "older reply" },
        { role: "user", content: "Speak from the lectern." },
      ],
      names,
    )
    expect(beat.you?.text).toBe("Speak from the lectern.")
    expect(beat.answer).toBe(null)
  })

  it("skips system lines", () => {
    const beat = resolveStageNowBeat(
      [
        { role: "user", content: "Hello" },
        { role: "system", content: "timeout" },
        { role: "agent", content: "Here." },
      ],
      names,
    )
    expect(beat.answer?.text).toBe("Here.")
  })
})

describe("displayStageTitle", () => {
  it("names the first Stage Keeper Stage", () => {
    expect(displayStageTitle("Keeper")).toBe("Keeper Stage")
    expect(displayStageTitle("")).toBe("Keeper Stage")
  })
})
