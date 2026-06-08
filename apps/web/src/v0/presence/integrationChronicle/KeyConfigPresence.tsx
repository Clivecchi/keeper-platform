"use client"

import * as React from "react"
import { KeyHealthBlock, LinkedAgentsBlock } from "./blocks"
import { ChronicleConfigShell } from "../chronicleConfig/useChronicleConfig"
import type { KeyFeedData } from "./feeds/KeyFeed"

export function KeyConfigPresence({
  displayLabel,
  description,
  feed,
  onBack,
}: {
  displayLabel: string
  description?: string | null
  feed: KeyFeedData
  onBack: () => void
}) {
  const { key, linkedAgents, rotate, rotateBusy, keySaveError, verify, verifyBusy } = feed

  return (
    <ChronicleConfigShell
      identity={{
        name: displayLabel,
        status: key.status,
      }}
      onBack={onBack}
      saveStatus={rotateBusy || verifyBusy ? "saving" : keySaveError ? "error" : "idle"}
      saveMessage={keySaveError}
      isDirty={false}
      onSave={() => void verify()}
      saveLabel="Verify"
    >
      {description && (
        <p
          className="mb-4 text-[12px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {description}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <KeyHealthBlock
          keySource={
            key.key_source === "env"
              ? "ENV"
              : key.key_source === "user"
                ? "USER"
                : "PLATFORM"
          }
          keyStatus={
            key.status === "valid"
              ? "valid"
              : key.status === "invalid" || key.status === "revoked"
                ? "invalid"
                : "missing"
          }
          lastVerified={key.last_verified}
          onKeyUpdate={(apiKey) => rotate(apiKey)}
          keyUpdateBusy={rotateBusy}
          keyUpdateError={keySaveError}
        />
        <div
          className="rounded-md border px-3 py-3"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <p
            className="text-[10px] uppercase tracking-wide mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Key source
          </p>
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {key.key_source.toUpperCase()}
            {key.key_source === "env"
              ? " — managed via environment variables"
              : key.key_source === "platform"
                ? " — platform credential store"
                : " — user credential store"}
          </p>
        </div>
        {key.integration_id && (
          <div
            className="rounded-md border px-3 py-3"
            style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
          >
            <p
              className="text-[10px] uppercase tracking-wide mb-2"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Linked integration
            </p>
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              {key.provider}
            </p>
          </div>
        )}
        <LinkedAgentsBlock
          agents={linkedAgents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            model: agent.model,
          }))}
        />
      </div>
    </ChronicleConfigShell>
  )
}
