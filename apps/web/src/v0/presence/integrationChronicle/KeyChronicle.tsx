"use client"

import * as React from "react"
import {
  ConnectionStatusBlock,
  KeyHealthBlock,
  LinkedAgentsBlock,
  type ConnectionHealth,
  type KeySource,
  type KeyStatus,
} from "./blocks"
import {
  ActionButton,
  CapabilityChips,
  FeedError,
  FeedShimmer,
  HeroZone,
  formatRelativeTime,
} from "./shared"
import type { GlowState } from "./serviceConfig"
import { providerDisplayLabel, providerIconLetter } from "./keyNavUtils"
import { useKeyFeedData } from "./feeds/KeyFeed"
import { KeyConfigPresence } from "./KeyConfigPresence"
import type { AgentCoverMode } from "../cover/coverTypes"

const KEY_ACTION_LABELS: Record<string, string> = {
  verify: "Verify",
  rotate: "Rotate",
  revoke: "Revoke",
}

function mapKeySource(source: string): KeySource {
  if (source === "env") return "ENV"
  if (source === "user") return "USER"
  if (source === "platform") return "PLATFORM"
  return "ENV"
}

function mapKeyStatus(status: string): KeyStatus {
  if (status === "valid") return "valid"
  if (status === "invalid" || status === "revoked") return "invalid"
  return "missing"
}

function statusToGlow(status: string): GlowState {
  if (status === "valid") return "healthy"
  if (status === "unknown" || status === "expired") return "building"
  if (status === "invalid" || status === "revoked") return "degraded"
  return "muted"
}

function statusToConnectionHealth(status: string): ConnectionHealth {
  if (status === "valid") return "connected"
  if (status === "invalid" || status === "revoked") return "error"
  if (status === "unknown" || status === "expired") return "degraded"
  return "disconnected"
}

function KeyIdentityBlock({
  displayLabel,
  keySource,
  description,
}: {
  displayLabel: string
  keySource: string
  description: string | null | undefined
}) {
  return (
    <div
      className="rounded-md border px-3 py-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h4 className="text-[14px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {displayLabel}
        </h4>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
          style={{
            borderColor: "hsl(210 80% 55% / 0.2)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          {keySource.toUpperCase()}
        </span>
      </div>
      {description && (
        <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {description}
        </p>
      )}
    </div>
  )
}

function KeyTraitStrip({
  keySource,
  lastVerified,
  expiresAt,
  status,
}: {
  keySource: string
  lastVerified: string | null
  expiresAt: string | null
  status: string
}) {
  const items = [
    { label: "Source", value: keySource.toUpperCase() },
    { label: "Last verified", value: formatRelativeTime(lastVerified ?? undefined) },
    ...(expiresAt ? [{ label: "Expires", value: formatRelativeTime(expiresAt) }] : []),
    { label: "Status", value: status },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className="rounded-full border px-2.5 py-1 text-[11px]"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          <span className="opacity-70">{item.label}: </span>
          {item.value}
        </span>
      ))}
    </div>
  )
}

function KeyCredentialPanel({
  keySource,
  status,
  onSave,
  saveBusy,
  saveError,
}: {
  keySource: string
  status: string
  onSave: (apiKey: string) => void | Promise<void>
  saveBusy: boolean
  saveError: string | null
}) {
  const isEnv = keySource === "env"
  const isValid = status === "valid"
  const needsCredential =
    status === "invalid" || status === "revoked" || status === "unknown" || status === "expired"
  const [keyInput, setKeyInput] = React.useState("")
  const [showUpdate, setShowUpdate] = React.useState(needsCredential)

  if (isEnv) {
    return (
      <div
        className="rounded-md border px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-wide mb-1.5"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Environment key
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {isValid
            ? "This key is set via environment variable. Update it in Railway to rotate."
            : "This provider expects an environment variable. Add the API key in Railway, then verify."}
        </p>
      </div>
    )
  }

  const fieldOpen = needsCredential || showUpdate

  return (
    <div
      className="rounded-md border px-3 py-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {needsCredential ? "Add API Key" : "API Key"}
        </p>
        {isValid && !needsCredential && (
          <button
            type="button"
            onClick={() => setShowUpdate((open) => !open)}
            className="text-[12px] underline-offset-2 hover:underline"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {showUpdate ? "Cancel" : "Update Key"}
          </button>
        )}
      </div>

      {fieldOpen ? (
        <div className="flex flex-col gap-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste API key"
            className="w-full rounded-md border px-2.5 py-2 text-[13px] bg-transparent"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.55)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
          <ActionButton
            label={saveBusy ? "Saving…" : needsCredential ? "Save" : "Save Key"}
            onClick={() => void onSave(keyInput)}
            disabled={saveBusy || !keyInput.trim()}
            variant="primary"
          />
          {saveError && (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
              {saveError}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Key is connected. Use Update Key to rotate the credential.
        </p>
      )}
    </div>
  )
}

function KeyChronicleBlocks({
  blocks,
  feed,
}: {
  blocks: string[]
  feed: NonNullable<ReturnType<typeof useKeyFeedData>["data"]>
}) {
  const { key, linkedAgents, rotate, rotateBusy, keySaveError } = feed

  return (
    <>
      {blocks.map((block) => {
        switch (block) {
          case "connection_status":
            return (
              <ConnectionStatusBlock
                key={block}
                connectedAt={key.last_verified}
                credentialSource={key.key_source.toUpperCase()}
                health={statusToConnectionHealth(key.status)}
              />
            )
          case "key_health":
            return (
              <KeyHealthBlock
                key={block}
                keySource={mapKeySource(key.key_source)}
                keyStatus={mapKeyStatus(key.status)}
                lastVerified={key.last_verified}
                onKeyUpdate={(apiKey) => rotate(apiKey)}
                keyUpdateBusy={rotateBusy}
                keyUpdateError={keySaveError}
                readOnly
              />
            )
          case "linked_agents":
            return (
              <LinkedAgentsBlock
                key={block}
                agents={linkedAgents.map((agent) => ({
                  id: agent.id,
                  name: agent.name,
                  model: agent.model,
                }))}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}

export function KeyChronicle({
  keyId,
  domainId,
  onLabelResolved,
}: {
  keyId: string
  domainId: string
  onLabelResolved?: (label: string) => void
}) {
  const { data: feed, loading, error, reload } = useKeyFeedData(keyId, domainId)

  React.useEffect(() => {
    if (feed?.key.display_label) {
      onLabelResolved?.(feed.key.display_label)
    }
  }, [feed?.key.display_label, onLabelResolved])
  const [chronicleMode, setChronicleMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setChronicleMode("cover")
  }, [keyId])

  if (loading && !feed) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !feed) {
    return <FeedError message={error} onRetry={() => void reload()} />
  }

  if (!feed) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Key not found
      </p>
    )
  }

  const {
    key,
    integrationCapabilities,
    verify,
    verifyBusy,
    revoke,
    saveCredential,
    rotateBusy,
    keySaveError,
  } = feed
  const displayLabel = key.display_label ?? providerDisplayLabel(key.provider)
  const providerLetter = providerIconLetter(key.provider)
  const blocks = key.chronicle_blocks ?? []
  const actions = key.chronicle_actions ?? []
  const glow = statusToGlow(key.status)
  const isConnected = key.status === "valid"

  if (chronicleMode === "config") {
    return (
      <KeyConfigPresence
        displayLabel={displayLabel}
        description={key.description}
        feed={feed}
        onBack={() => setChronicleMode("cover")}
      />
    )
  }

  const resolvedActions = actions
    .map((slug) => {
      const label = KEY_ACTION_LABELS[slug]
      if (!label) return null
      if (slug === "verify") {
        return {
          label,
          onClick: () => void verify(),
          disabled: verifyBusy,
          variant: "primary" as const,
        }
      }
      if (slug === "rotate") {
        return {
          label,
          onClick: () => setChronicleMode("config"),
          variant: "secondary" as const,
        }
      }
      if (slug === "revoke") {
        return {
          label,
          onClick: () => void revoke(),
          variant: "secondary" as const,
        }
      }
      return null
    })
    .filter(Boolean) as Array<{
    label: string
    onClick: () => void
    disabled?: boolean
    variant?: "primary" | "secondary"
  }>

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[15px] font-semibold"
          style={{
            background: "hsl(var(--theme-surface-elevated) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
            boxShadow: isConnected
              ? undefined
              : "0 0 16px 2px hsl(var(--theme-ink-tertiary) / 0.2)",
          }}
          aria-hidden
        >
          {providerLetter}
        </span>
        <div className="min-w-0 flex-1">
          <HeroZone
            title={displayLabel}
            subtitle={`${key.key_source.toUpperCase()} · ${key.status}`}
            glow={isConnected ? glow : "muted"}
          />
        </div>
      </div>

      <KeyIdentityBlock
        displayLabel={displayLabel}
        keySource={key.key_source}
        description={key.description}
      />

      <KeyCredentialPanel
        keySource={key.key_source}
        status={key.status}
        onSave={async (apiKey) => {
          await saveCredential(apiKey)
          await reload()
        }}
        saveBusy={rotateBusy}
        saveError={keySaveError}
      />

      <KeyTraitStrip
        keySource={key.key_source}
        lastVerified={key.last_verified}
        expiresAt={key.expires_at}
        status={key.status}
      />

      <KeyChronicleBlocks blocks={blocks} feed={feed} />

      {resolvedActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {resolvedActions.map((action) => (
            <ActionButton
              key={action.label}
              label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              variant={action.variant}
            />
          ))}
        </div>
      )}

      <CapabilityChips capabilities={integrationCapabilities} />
    </div>
  )
}
