import { describe, expect, it } from "vitest"
import {
  applyObjectThemeUpload,
  extractObjectTheme,
  getActiveVisualUrl,
} from "./objectTheme.js"

describe("objectTheme", () => {
  it("appends theme bits in upload order", () => {
    let schema: Record<string, unknown> = {}
    schema = applyObjectThemeUpload(schema, "avatar", "https://example.com/a.jpg", "key-a")
    schema = applyObjectThemeUpload(schema, "cover", "https://example.com/c.jpg", "key-c")

    const theme = extractObjectTheme(schema)
    expect(theme.bits).toHaveLength(2)
    expect(theme.bits[0].role).toBe("avatar")
    expect(theme.bits[1].role).toBe("cover")
    expect(getActiveVisualUrl(schema, "avatar")).toBe("https://example.com/a.jpg")
    expect(getActiveVisualUrl(schema, "cover")).toBe("https://example.com/c.jpg")
  })

  it("removes the latest bit for a role and re-syncs active fields", () => {
    let schema = applyObjectThemeUpload({}, "avatar", "https://example.com/one.jpg")
    schema = applyObjectThemeUpload(schema, "avatar", "https://example.com/two.jpg")
    schema = applyObjectThemeUpload(schema, "avatar", null)

    expect(extractObjectTheme(schema).bits).toHaveLength(1)
    expect(getActiveVisualUrl(schema, "avatar")).toBe("https://example.com/one.jpg")
  })
})
