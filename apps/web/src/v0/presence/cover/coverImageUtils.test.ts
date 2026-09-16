// @vitest-environment node
import { describe, expect, it } from "vitest"
import { coverFromRecord, heroImageFromRecord } from "./coverImageUtils"

describe("coverFromRecord / heroImageFromRecord", () => {
  it("reads Domain cover from theme bits when the flat field is missing", () => {
    const record = {
      theme: {
        objectTheme: {
          bits: [
            {
              id: "bit-1",
              role: "cover",
              url: "https://cdn.example.com/domain.jpg",
              uploadedAt: "2026-09-15T00:00:00.000Z",
            },
          ],
        },
      },
    }
    expect(coverFromRecord(record).coverImage).toBe("https://cdn.example.com/domain.jpg")
    expect(heroImageFromRecord(record).url).toBe("https://cdn.example.com/domain.jpg")
  })

  it("reads a flat coverImage when theme is empty", () => {
    const record = { coverImage: "https://cdn.example.com/flat.jpg", coverImageKey: "k1" }
    expect(coverFromRecord(record)).toEqual({
      coverImage: "https://cdn.example.com/flat.jpg",
      coverImageKey: "k1",
    })
  })

  it("falls back to Keeper avatar when cover is missing", () => {
    const record = {
      presenceSchema: {
        avatar: "https://cdn.example.com/keeper.png",
      },
    }
    expect(heroImageFromRecord(record).url).toBe("https://cdn.example.com/keeper.png")
  })
})
