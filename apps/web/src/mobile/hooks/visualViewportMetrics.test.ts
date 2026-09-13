// @vitest-environment node
import { describe, expect, it } from "vitest"
import { visualViewportMetrics } from "./visualViewportMetrics"

describe("visualViewportMetrics", () => {
  it("uses visual viewport height when present", () => {
    expect(visualViewportMetrics({ height: 420, offsetTop: 12 }, 800)).toEqual({
      height: 420,
      offsetTop: 12,
    })
  })

  it("falls back when visual viewport is missing or empty", () => {
    expect(visualViewportMetrics(null, 800)).toEqual({
      height: 800,
      offsetTop: 0,
    })
    expect(visualViewportMetrics({ height: 0, offsetTop: 0 }, 640)).toEqual({
      height: 640,
      offsetTop: 0,
    })
  })
})
