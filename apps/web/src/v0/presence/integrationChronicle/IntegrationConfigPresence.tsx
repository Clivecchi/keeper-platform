"use client"

import * as React from "react"
import { KeyHealthBlock, LinkedAgentsBlock } from "./blocks"
import type { AIModelFeedData } from "./feeds/AIModelFeed"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import { FeedShimmer, type IntegrationType } from "./shared"
import type { FeedDataState } from "./serviceConfig"
import {
  IntegrationAIModelConfigBlocks,
  integrationKeyStatusLabel,
} from "./declarationChronicle"

export function IntegrationConfigPresence({
  displayLabel,
  integrationType,
  description,
  feed,
  onBack,
}: {
  displayLabel: string
  integrationType: IntegrationType
  description?: string | null
  feed: FeedDataState<unknown>
  onBack: () => void
}) {
  const d = feed.data as AIModelFeedData
  const statusLabel = integrationKeyStatusLabel(d.keyHealth?.status, integrationType)

  return (
    <ChronicleConfigShell
      identity={{
        name: displayLabel,
        status: statusLabel,
      }}
      onBack={onBack}
      saveStatus={
        d.keySaveBusy ? "saving" : d.keySaveError ? "error" : d.keySaveSuccess ? "saved" : "idle"
      }
      saveMessage={d.keySaveError ?? d.keySaveSuccess}
      isDirty={false}
      onSave={() => {}}
      saveLabel="Save"
    >
      {description && (
        <p
          className="mb-4 text-[12px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {description}
        </p>
      )}

      {feed.loading && !d.keyHealth ? (
        <FeedShimmer rows={4} />
      ) : (
        <IntegrationAIModelConfigBlocks feed={feed} />
      )}
    </ChronicleConfigShell>
  )
}
