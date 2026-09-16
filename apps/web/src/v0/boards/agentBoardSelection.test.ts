import { describe, expect, it } from "vitest"
import {
  isAgentBoardId,
  shouldKeepAgentWhenSelectingDialog,
  shouldKeepAgentWhenSelectingLibrary,
  shouldKeepDialogWhenSelectingAgent,
} from "./agentBoardSelection"
import { resolveChroniclePrimary } from "@keeper/shared"

const emptySelection = {
  selectedDialogId: null,
  selectedJourneyId: null,
  selectedPathId: null,
  selectedMomentId: null,
  selectedKeeperId: null,
  selectedDraftId: null,
  selectedAgentId: null,
  selectedServiceSlug: null,
  selectedKeyId: null,
  selectedCapabilityId: null,
  selectedLibraryItemId: null,
  selectedSoleMemoryId: null,
  selectedBoardDefId: null,
  selectedGlossaryId: null,
}

describe("agentBoardSelection", () => {
  it("keeps Agent subject when a Dialog is selected on Agent Board", () => {
    expect(isAgentBoardId("agent")).toBe(true)
    expect(isAgentBoardId("agency")).toBe(true)
    expect(shouldKeepAgentWhenSelectingDialog("agent", "kip-id")).toBe(true)
    expect(shouldKeepDialogWhenSelectingAgent("agent")).toBe(true)
    expect(shouldKeepAgentWhenSelectingLibrary("agent")).toBe(true)
  })

  it("does not change Domain Board exclusivity", () => {
    expect(shouldKeepAgentWhenSelectingDialog("domain", "kip-id")).toBe(false)
    expect(shouldKeepDialogWhenSelectingAgent("domain")).toBe(false)
    expect(shouldKeepAgentWhenSelectingLibrary("domain")).toBe(false)
  })

  it("keeps Chronicle on the Agent when both Agent and Dialog are selected", () => {
    const primary = resolveChroniclePrimary({
      ...emptySelection,
      selectedAgentId: "kip-id",
      selectedDialogId: "finding-the-plot",
    })
    expect(primary).toEqual({ kind: "agent", id: "kip-id" })
  })
})
