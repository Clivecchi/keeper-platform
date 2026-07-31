import { describe, expect, it, vi } from "vitest"
import type { ChronicleEvent } from "@keeper/shared"
import {
  chronicleViewedStorageKey,
  groupChronicleEvents,
  hasUnreadChronicle,
  markChronicleViewed,
  scrollToChroniclePoint,
} from "./chronicleMobile"

describe("Chronicle mobile helpers", () => {
  it("groups child history beneath its parent", () => {
    const event = (id: string, parentEventId?: string): ChronicleEvent => ({
      id, dialogId: "dialog", domainId: "domain", actor: "Kip", eventType: "moment",
      title: id, summary: id, timestamp: "2026-01-01T00:00:00.000Z", parentEventId,
    })
    const groups = groupChronicleEvents([event("parent"), event("child", "parent")])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.children[0]?.id).toBe("child")
  })

  it("records and compares Chronicle viewing state", () => {
    vi.stubGlobal("window", { localStorage: new MapStorage() })
    markChronicleViewed("dialog", Date.parse("2026-01-01T00:00:00.000Z"))
    expect(window.localStorage.getItem(chronicleViewedStorageKey("dialog"))).toBe("1767225600000")
    expect(hasUnreadChronicle("dialog", "2026-01-02T00:00:00.000Z")).toBe(true)
  })

  it("scrolls to a durable point anchor", () => {
    const scrollIntoView = vi.fn()
    vi.stubGlobal("document", {
      getElementById: () => null,
      querySelector: () => ({ scrollIntoView }),
    })
    expect(scrollToChroniclePoint("point-1")).toBe(true)
    expect(scrollIntoView).toHaveBeenCalled()
  })
})

class MapStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}
