import type { RealmFeedCounts } from "@keeper/shared"
import type { AgentDialogueMessage } from "../../components/agent/types"
import { buildRealmInvitations } from "./realmInvitations"

export const REALM_ARRIVAL_MESSAGE_ID = "realm-arrival-remarks"

export function buildRealmArrivalMessage(
  remarks: string,
  counts: RealmFeedCounts,
  isLoading = false,
): AgentDialogueMessage {
  return {
    id: REALM_ARRIVAL_MESSAGE_ID,
    role: "agent",
    content: isLoading ? "…" : remarks.trim() || "Welcome back.",
    createdAt: new Date().toISOString(),
    arrivalInvitations: buildRealmInvitations(counts).map((inv) => ({
      id: inv.id,
      label: inv.label,
    })),
  }
}

export function isRealmArrivalMessage(message: AgentDialogueMessage): boolean {
  return message.id === REALM_ARRIVAL_MESSAGE_ID
}
