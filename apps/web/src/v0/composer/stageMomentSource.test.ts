// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { StageStorySlide } from "@keeper/shared"
import {
  MOMENT_SOURCE_LOADING_TITLE,
  MOMENT_SOURCE_UNRESOLVED_BODY,
  MOMENT_SOURCE_UNRESOLVED_TITLE,
  applyCanonicalMomentToSlide,
  collectMomentSourceIds,
  parseCanonicalMomentResponse,
} from "./stageMomentSource"

const copied: StageStorySlide = {
  id: "s1",
  slideType: "text_slide",
  kind: "beat",
  title: "Copied title",
  body: "Copied narrative that must not display as current.",
  source: { kind: "moment", id: "moment-1" },
}

describe("collectMomentSourceIds", () => {
  it("collects unique moment source ids and skips other kinds", () => {
    expect(
      collectMomentSourceIds([
        copied,
        { ...copied, id: "s2", source: { kind: "moment", id: "moment-1" } },
        { ...copied, id: "s3", source: { kind: "point", id: "p1" } },
        { ...copied, id: "s4", source: { kind: "moment", id: "moment-2" } },
        { ...copied, id: "s5", source: { kind: "moment", id: "  " } },
      ]),
    ).toEqual(["moment-1", "moment-2"])
  })
})

describe("parseCanonicalMomentResponse", () => {
  it("reads { moment } from GET /api/moments/:id", () => {
    expect(
      parseCanonicalMomentResponse(
        { moment: { id: "moment-1", title: " Live title ", narrative: "Live narrative" } },
        "moment-1",
      ),
    ).toEqual({
      status: "live",
      moment: { id: "moment-1", title: "Live title", narrative: "Live narrative" },
    })
  })

  it("rejects a mismatched id rather than using another Moment", () => {
    expect(
      parseCanonicalMomentResponse(
        { moment: { id: "other", title: "Wrong", narrative: "Wrong" } },
        "moment-1",
      ),
    ).toEqual({ status: "unresolved" })
  })
})

describe("applyCanonicalMomentToSlide", () => {
  it("leaves non-moment slides as copied Stage strings", () => {
    const slide: StageStorySlide = {
      ...copied,
      source: { kind: "live", id: "msg-1" },
    }
    const next = applyCanonicalMomentToSlide(slide, new Map(), false)
    expect(next.title).toBe("Copied title")
    expect(next.body).toBe("Copied narrative that must not display as current.")
    expect(next.sourceResolve).toBeUndefined()
  })

  it("presents live Moment title/narrative and keeps the source reference", () => {
    const lookup = new Map([
      [
        "moment-1",
        {
          status: "live" as const,
          moment: { id: "moment-1", title: "Canonical title", narrative: "Canonical narrative" },
        },
      ],
    ])
    const next = applyCanonicalMomentToSlide(copied, lookup, false)
    expect(next.title).toBe("Canonical title")
    expect(next.body).toBe("Canonical narrative")
    expect(next.source).toEqual({ kind: "moment", id: "moment-1" })
    expect(next.sourceResolve).toBe("live")
    expect(next.title).not.toBe(copied.title)
    expect(next.body).not.toBe(copied.body)
  })

  it("does not show copied strings while loading", () => {
    const next = applyCanonicalMomentToSlide(copied, new Map(), true)
    expect(next.title).toBe(MOMENT_SOURCE_LOADING_TITLE)
    expect(next.body).toBe("")
    expect(next.source).toEqual({ kind: "moment", id: "moment-1" })
    expect(next.sourceResolve).toBe("loading")
  })

  it("fails honestly when the Moment cannot be resolved", () => {
    const lookup = new Map([["moment-1", { status: "unresolved" as const }]])
    const next = applyCanonicalMomentToSlide(copied, lookup, false)
    expect(next.title).toBe(MOMENT_SOURCE_UNRESOLVED_TITLE)
    expect(next.body).toBe(MOMENT_SOURCE_UNRESOLVED_BODY)
    expect(next.body).not.toContain("Copied")
    expect(next.source).toEqual({ kind: "moment", id: "moment-1" })
    expect(next.sourceResolve).toBe("unresolved")
  })

  it("fails honestly when source.kind is moment but id is missing", () => {
    const slide: StageStorySlide = { ...copied, source: { kind: "moment", id: null } }
    const next = applyCanonicalMomentToSlide(slide, new Map(), false)
    expect(next.title).toBe(MOMENT_SOURCE_UNRESOLVED_TITLE)
    expect(next.sourceResolve).toBe("unresolved")
    expect(next.source?.kind).toBe("moment")
  })
})
