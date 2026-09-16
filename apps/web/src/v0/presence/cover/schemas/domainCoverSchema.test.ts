// @vitest-environment node
import { describe, expect, it } from "vitest"
import { domainCoverSchema } from "./domainCoverSchema"

describe("domainCoverSchema", () => {
  it("shows primary agent as a cover trait when the name is known", () => {
    const content = domainCoverSchema.resolve(
      { name: "ke3p", leadAgentName: "Kip", visibility: "private" },
      { visibility: "private" },
      { objectId: "domain-1" },
      { onConfigure: () => {}, onOpenSession: () => {} },
    )

    expect(content.traits).toEqual(
      expect.arrayContaining([{ label: "Primary Agent", value: "Kip" }]),
    )
  })

  it("adds a People cover action when the handler is provided", () => {
    const content = domainCoverSchema.resolve(
      { name: "ke3p" },
      {},
      { objectId: "domain-1" },
      { onConfigure: () => {}, onPeople: () => {}, onOpenSession: () => {} },
    )

    expect(content.actions.map((action) => action.id)).toEqual(["configure", "people"])
  })

  it("shows the Domain cover from theme when record.coverImage is empty", () => {
    const content = domainCoverSchema.resolve(
      {
        name: "ke3p",
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
      },
      {},
      { objectId: "domain-1" },
      { onConfigure: () => {}, onOpenSession: () => {} },
    )

    expect(content.hero.avatar).toContain("domain.jpg")
  })

  it("omits primary agent when the name is not known", () => {
    const content = domainCoverSchema.resolve(
      { name: "ke3p" },
      {},
      { objectId: "domain-1" },
      { onConfigure: () => {}, onOpenSession: () => {} },
    )

    expect(content.traits.some((trait) => trait.label === "Primary Agent")).toBe(false)
  })
})
