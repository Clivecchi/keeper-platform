"use client"

/**
 * IntegrationPresence — routes to service-specific Integration Chronicle surfaces.
 */
import { RailwayIntegrationChronicle } from "./RailwayIntegrationChronicle"
import { VercelIntegrationChronicle } from "./VercelIntegrationChronicle"
import { GitHubIntegrationChronicle } from "./GitHubIntegrationChronicle"

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
  switch (serviceSlug) {
    case "railway":
      return (
        <RailwayIntegrationChronicle
          domainId={domainId}
          boardId={boardId}
          agentSlug={agentSlug}
        />
      )
    case "vercel":
      return (
        <VercelIntegrationChronicle
          domainId={domainId}
          boardId={boardId}
          agentSlug={agentSlug}
        />
      )
    case "github":
      return (
        <GitHubIntegrationChronicle
          domainId={domainId}
          boardId={boardId}
          agentSlug={agentSlug}
        />
      )
    default:
      return (
        <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Unknown integration: {serviceSlug}
        </p>
      )
  }
}
