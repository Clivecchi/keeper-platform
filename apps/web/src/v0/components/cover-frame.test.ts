import { describe, expect, it } from "vitest"
import { resolveCoverImprint } from "./coverImprint"

describe("resolveCoverImprint", () => {
  it("uses the domain name, not KE3P", () => {
    expect(
      resolveCoverImprint({
        isPlaceholder: false,
        domainName: "livecchi.biz",
        domainSlug: "livecchi-biz",
      }),
    ).toBe("livecchi.biz")
  })

  it("falls back to slug when name is empty", () => {
    expect(
      resolveCoverImprint({
        isPlaceholder: false,
        domainName: "  ",
        domainSlug: "livecchi-biz",
      }),
    ).toBe("livecchi-biz")
  })

  it("stays empty while the domain is still a placeholder", () => {
    expect(
      resolveCoverImprint({
        isPlaceholder: true,
        domainName: "livecchi.biz",
        domainSlug: "livecchi-biz",
      }),
    ).toBeNull()
  })
})
