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
}

export function IntegrationPresence({
  serviceSlug,
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: IntegrationPresenceProps) {
  return (
    <IntegrationChronicle
      serviceSlug={serviceSlug}
      domainId={domainId}
      boardId={boardId}
      agentSlug={agentSlug}
    />
  )
}
