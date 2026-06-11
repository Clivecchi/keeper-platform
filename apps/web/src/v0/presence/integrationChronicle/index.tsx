// RETIRED — integration now renders through KeeperPresence → IntegrationFocusPresence
// This file is no longer in the render path. Safe to delete after browser verification.

"use client"

/**
 * IntegrationPresence — routes to the universal Integration Chronicle shell.
 */
import { IntegrationChronicle } from "./IntegrationChronicle"

export type { IntegrationStatus, IntegrationDto } from "./shared"

export interface IntegrationPresenceProps {
  serviceSlug: string
  domainId: string
  boardId?: string
  agentSlug?: string
  onKeySelect?: (keyId: string) => void
}

export function IntegrationPresence({
  serviceSlug,
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
  onKeySelect,
}: IntegrationPresenceProps) {
  return (
    <IntegrationChronicle
      serviceSlug={serviceSlug}
      domainId={domainId}
      boardId={boardId}
      agentSlug={agentSlug}
      onKeySelect={onKeySelect}
    />
  )
}
