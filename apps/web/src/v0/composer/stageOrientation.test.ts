import { describe, expect, it } from "vitest"
import {
  appendStageVisit,
  buildStageOrientation,
  type StageVisit,
} from "./stageOrientation"

const realm: StageVisit = { scope: "realm" }
const ke3p: StageVisit = { scope: "domain", domainId: "ke3p-id" }
const frogmore: StageVisit = { scope: "domain", domainId: "frogmore-id" }
const names = { "ke3p-id": "KE3P", "frogmore-id": "Frogmore" }

describe("buildStageOrientation", () => {
  it("keeps an arriving admin in Where are we? and names the realm", () => {
    const orientation = buildStageOrientation({
      visits: [realm],
      cursor: 0,
      presentation: "where-we-are",
      audience: "admin",
      arriving: true,
      names,
    })
    expect(orientation.truth).toBe("realm-where-we-are")
    expect(orientation.contextLabel).toBe("Realm")
    expect(orientation.onStageLabel).toBe("Where are we?")
    expect(orientation.steps.map((step) => step.label)).toEqual(["Realm"])
  })

  it("keeps the realm reading after a domain continuation, and offers the shell story", () => {
    const visits = appendStageVisit(appendStageVisit([], realm), ke3p)
    const orientation = buildStageOrientation({
      visits,
      cursor: 1,
      presentation: "where-we-are",
      audience: "admin",
      arriving: false,
      shellDomainId: "ke3p-id",
      names,
    })
    expect(orientation.truth).toBe("domain-where-we-are")
    expect(orientation.contextLabel).toBe("KE3P")
    expect(orientation.steps.map((step) => step.id)).toEqual([
      "where:realm",
      "where:domain:ke3p-id",
      "story:domain:ke3p-id",
    ])
    expect(orientation.currentStepId).toBe("where:domain:ke3p-id")
  })

  it("returns to an earlier presentation without dropping the later ones", () => {
    const visits = appendStageVisit([realm, ke3p], frogmore)
    const orientation = buildStageOrientation({
      visits,
      cursor: 0,
      presentation: "where-we-are",
      audience: "admin",
      arriving: false,
      shellDomainId: "ke3p-id",
      names,
    })
    expect(orientation.truth).toBe("realm-where-we-are")
    expect(orientation.steps.map((step) => step.label)).toEqual([
      "Realm",
      "KE3P",
      "Story",
      "Frogmore",
    ])
  })

  it("does not offer another domain's story as this shell's filmstrip", () => {
    const orientation = buildStageOrientation({
      visits: [realm, frogmore],
      cursor: 1,
      presentation: "where-we-are",
      audience: "admin",
      arriving: true,
      shellDomainId: "ke3p-id",
      names,
    })
    expect(orientation.steps.some((step) => step.presentation === "story")).toBe(false)
  })

  it("shows the slide title while the story is the presentation", () => {
    const orientation = buildStageOrientation({
      visits: [ke3p],
      cursor: 0,
      presentation: "story",
      audience: "admin",
      arriving: false,
      shellDomainId: "ke3p-id",
      names,
      slideTitle: "The door",
    })
    expect(orientation.truth).toBe("story")
    expect(orientation.contextLabel).toBe("KE3P")
    expect(orientation.onStageLabel).toBe("The door")
    expect(orientation.currentStepId).toBe("story:domain:ke3p-id")
    expect(orientation.steps.map((step) => step.label)).toEqual(["KE3P", "Story"])
  })

  it("does not send a keeper back through Where are we?", () => {
    const orientation = buildStageOrientation({
      visits: [ke3p],
      cursor: 0,
      presentation: null,
      audience: "keeper",
      arriving: true,
      shellDomainId: "ke3p-id",
      names,
      slideTitle: "Root",
    })
    expect(orientation.truth).toBe("story")
    expect(orientation.steps.map((step) => step.presentation)).toEqual(["story"])
    expect(orientation.onStageLabel).toBe("Root")
  })
})
