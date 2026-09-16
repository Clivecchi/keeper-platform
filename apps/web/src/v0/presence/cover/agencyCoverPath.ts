import { workingAgencyHeld, type AgencyPlaceFacts } from "./agencyPlace"

export type AgencyTerrainNavigate = "dialog" | "inspect"

export type AgencyCoverRole = "now" | "needsYou" | "becoming" | "present"

export const AGENCY_COVER_ROLE_LABEL: Record<AgencyCoverRole, string> = {
  now: "Now",
  needsYou: "Needs you",
  becoming: "Becoming",
  present: "Present",
}

export interface AgencyTerrainItem {
  id: string
  label: string
  preview?: string
  sub?: string
  navigate: AgencyTerrainNavigate | null
}

export interface AgencyCoverReach {
  role: AgencyCoverRole
  prominence: "alive" | "path" | "settled"
  item: AgencyTerrainItem
}

export const WORKING_AGENCY_ID = "agency-working"

/**
 * Judge Agency Cover terrain from live Place facts.
 * Empty Needs you / Becoming is correct. Do not fill for completeness.
 */
export function judgeAgencyCoverPath(facts: AgencyPlaceFacts | null): AgencyCoverReach[] {
  if (!facts) return []

  const path: AgencyCoverReach[] = []
  const performance = facts.lastPerformance
  if (performance) {
    path.push({
      role: "now",
      prominence: "alive",
      item: {
        id: performance.dialogId,
        label: performance.dialogTitle,
        preview: "The last binding performance in this Agency.",
        sub: "Dialog · last binding performance",
        navigate: "dialog",
      },
    })
  }

  if (workingAgencyHeld(facts)) {
    const heldOn = performance?.dialogTitle?.trim()
    path.push({
      role: "present",
      prominence: "settled",
      item: {
        id: WORKING_AGENCY_ID,
        label: "Keeper's working Agency",
        preview: heldOn
          ? `How this Domain is being led — last held on ${heldOn}.`
          : "How this Domain is being led.",
        sub: "Agency · in force",
        navigate: "inspect",
      },
    })
  }

  return path
}
