"use client"

/**
 * Dev-only preview for Stage 1 block primitive isolation testing.
 * Not wired into IntegrationChronicle — Stage 3 will render blocks from declarations.
 */
import {
  ConnectionStatusBlock,
  DeploymentFeedBlock,
  KeyHealthBlock,
  LinkedAgentsBlock,
  ModelCatalogBlock,
  RepositoryActivityBlock,
} from "./index"

export function BlockPrimitivesPreview() {
  return (
    <div className="flex flex-col gap-4 px-4 py-5 max-w-lg">
      <ConnectionStatusBlock
        connectedAt={new Date().toISOString()}
        credentialSource="Platform env"
        health="connected"
      />
      <KeyHealthBlock
        keySource="ENV"
        keyStatus="invalid"
        lastVerified={new Date().toISOString()}
        onKeyUpdate={() => {}}
      />
      <ModelCatalogBlock
        modelCount={52}
        lastFetched={new Date().toISOString()}
        isFallback={false}
        onRefresh={() => {}}
      />
      <DeploymentFeedBlock
        deployments={[
          {
            id: "dep-1",
            title: "api-service",
            status: "SUCCESS",
            timestampLabel: "2h ago",
            logs: [{ message: "Build completed successfully." }],
          },
        ]}
        onRedeploy={() => {}}
      />
      <RepositoryActivityBlock
        commits={[
          { sha: "a1b2c3d", message: "Fix integration chronicle blocks", author: "dev", date: new Date().toISOString() },
        ]}
        pullRequests={[{ number: 42, title: "Stage 1 rendering refactor", state: "open" }]}
        branches={[{ name: "main", protected: true }, { name: "feature/blocks" }]}
      />
      <LinkedAgentsBlock
        agents={[
          { id: "1", name: "Kip", model: "claude-sonnet-4-6" },
          { id: "2", name: "Cloud", model: "gpt-4o" },
        ]}
      />
    </div>
  )
}
