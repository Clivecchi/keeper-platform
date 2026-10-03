import { describe, expect, it } from "vitest"
import type { WhereWeAreReading } from "@keeper/shared"
import { realmWhereWeAreLines, whereWeAreClaimLine, whereWeAreUncertainty } from "./whereWeAreCopy"

const unresolved: WhereWeAreReading = {
  places: [
    { dialogId: "plot", title: "Finding the Plot" },
    { dialogId: "together", title: "Becoming Together" },
    { dialogId: "speak", title: "Be.Speak.Become" },
  ],
  claims: [
    { kind: "kept-orientation", dialogId: "plot", title: "Finding the Plot", provenance: {} },
    {
      kind: "cleared-orientation-with-forward",
      dialogId: "together",
      title: "Becoming Together",
      provenance: {},
    },
    {
      kind: "recent-kept-dialog",
      dialogId: "speak",
      title: "Be.Speak.Become",
      provenance: {},
    },
  ],
  trail: { stageBeatTitles: [], chatterTitles: [], history: [] },
}

describe("where we are copy", () => {
  it("says the KE3P uncertainty in plain lines", () => {
    expect(whereWeAreUncertainty(unresolved)).toBe(
      "The trail does not currently resolve to one place.",
    )
    expect(unresolved.claims.map(whereWeAreClaimLine)).toEqual([
      "Finding the Plot has the kept Orientation.",
      "Becoming Together had its Orientation cleared and retains an authored Forward.",
      "Be.Speak.Become is the most recently kept named Dialog.",
    ])
  })

  it("drops the uncertainty line when one place carries every claim", () => {
    const reading: WhereWeAreReading = {
      ...unresolved,
      places: [{ dialogId: "plot", title: "Finding the Plot" }],
      claims: [unresolved.claims[0]!],
    }
    expect(whereWeAreUncertainty(reading)).toBeNull()
  })

  it("reuses a Domain reading as one Realm continuation", () => {
    expect(realmWhereWeAreLines(unresolved)).toEqual([
      "The trail does not currently resolve to one place.",
      "Finding the Plot has the kept Orientation.",
      "Becoming Together had its Orientation cleared and retains an authored Forward.",
      "Be.Speak.Become is the most recently kept named Dialog.",
    ])
    const onePlace: WhereWeAreReading = {
      ...unresolved,
      places: [{ dialogId: "speak", title: "Be.Speak.Become" }],
      claims: [unresolved.claims[2]!],
    }
    expect(realmWhereWeAreLines(onePlace)).toEqual([
      "Be.Speak.Become is the most recently kept named Dialog.",
    ])
  })
})
