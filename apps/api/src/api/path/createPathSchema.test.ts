import { describe, expect, it } from "vitest"
import { z } from "zod"

const createPathSchema = z.object({
  name: z.string().min(1).max(200),
  prelude: z.string().max(1000).optional(),
  domainId: z.string().uuid(),
  journeyId: z.string().min(1),
  keeperId: z.string().min(1),
})

describe("createPathSchema @smoke", () => {
  it("accepts slug-style journey and keeper ids", () => {
    const parsed = createPathSchema.parse({
      name: "Winter rituals",
      domainId: "550e8400-e29b-41d4-a716-446655440000",
      journeyId: "journey-1730000000000",
      keeperId: "keeper-heart-default",
    })

    expect(parsed.journeyId).toBe("journey-1730000000000")
    expect(parsed.keeperId).toBe("keeper-heart-default")
  })
})
