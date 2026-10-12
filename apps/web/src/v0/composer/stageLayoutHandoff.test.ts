import { describe, expect, it } from "vitest"
import {
  classifyStageLayout,
  filmstripMatchesLayout,
  readStageLayoutReceipt,
  stageCanvasReading,
  stageLayoutReceiptMessage,
} from "./stageLayoutHandoff"

const titles = [
  "Bring Something Unfinished",
  "Speak. Find the Thread.",
  "“So Do It” Must Mean Something",
  "Same Work. A New Expression.",
  "Worth Keeping Means Worth Returning To",
]

const layoutMessage = {
  id: "210571b1-3995-4a83-b82f-8f9d79057589",
  actionResults: [
    {
      type: "stage.story.layout",
      status: "success" as const,
      data: { titles, slideCount: 5 },
    },
  ],
}

describe("stage layout handoff", () => {
  it("reads the Lead layout and does not treat it as a Story", () => {
    expect(readStageLayoutReceipt(layoutMessage)?.titles).toEqual(titles)
    expect(stageLayoutReceiptMessage(5)).toBe(
      "Laid out 5 Slides on the Stage filmstrip. No Story was saved. This receipt does not verify what is on screen.",
    )
  })

  it("matches the stored filmstrip by title order", () => {
    const receipt = readStageLayoutReceipt(layoutMessage)!
    expect(filmstripMatchesLayout(receipt, titles.map((title) => ({ title })))).toBe(true)
    expect(filmstripMatchesLayout(receipt, [{ title: "Finding the Plot" }])).toBe(false)
  })

  it("keeps a later conversation from hiding the matching filmstrip, and a later Frame from being hidden", () => {
    const slides = titles.map((title) => ({ title }))
    const messages = [
      { id: "older-frame" },
      layoutMessage,
      { id: "later-user" },
      { id: "later-reply" },
    ]
    const classified = classifyStageLayout({ messages, slides })
    expect(classified.current?.messageId).toBe(layoutMessage.id)
    expect(stageCanvasReading({
      messages,
      current: classified.current,
      stale: classified.stale,
      performedMessageId: "older-frame",
    })).toBe("filmstrip")
    expect(stageCanvasReading({
      messages,
      current: classified.current,
      stale: classified.stale,
      performedMessageId: "later-reply",
    })).toBe("frame")
  })

  it("waits to judge a layout until the filmstrip has slides", () => {
    expect(classifyStageLayout({ messages: [layoutMessage], slides: [] })).toEqual({
      current: null,
      stale: null,
    })
  })

  it("says the filmstrip changed when the titles no longer match", () => {
    const classified = classifyStageLayout({
      messages: [layoutMessage],
      slides: [{ title: "Finding the Plot" }],
    })
    expect(classified.current).toBeNull()
    expect(classified.stale?.messageId).toBe(layoutMessage.id)
    expect(stageCanvasReading({
      messages: [layoutMessage],
      current: null,
      stale: classified.stale,
      performedMessageId: null,
    })).toBe("stale")
  })
})
