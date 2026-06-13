"use client"

import * as React from "react"
import { KeyHealthBlock, LinkedAgentsBlock } from "./blocks"
import { ActionButton } from "./shared"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import type { KeyFeedData } from "./feeds/KeyFeed"

export type KeyMetadataFields = {
  display_label: string
  description: string
}

function toMetadataFields(
  displayLabel: string,
  description?: string | null,
): KeyMetadataFields {
  return {
    display_label: displayLabel,
    description: description ?? "",
  }
}

export function KeyConfigPresence({
  keyId,
  domainId,
  displayLabel,
  description,
  feed,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  keyId: string
  domainId: string
  displayLabel: string
  description?: string | null
  feed: KeyFeedData
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const {
    key,
    linkedAgents,
    saveCredential,
    rotateBusy,
    keySaveError,
    verify,
    verifyBusy,
    revoke,
    reload,
  } = feed

  const baselineRef = React.useRef(toMetadataFields(displayLabel, description))
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  React.useEffect(() => {
    const next = toMetadataFields(displayLabel, description)
    baselineRef.current = next
    setFieldValues(next)
  }, [keyId, displayLabel, description])

  const chronicleConfig = useChronicleConfig({
    entityKind: "key",
    entityId: keyId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string> = {}
      if (current.display_label.trim() !== baseline.display_label.trim()) {
        patch.display_label = current.display_label.trim()
      }
      if (current.description !== baseline.description) {
        patch.description = current.description
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.display_label.trim().length === 0) {
        return "Display label is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value !== "string") return
      baselineRef.current = { ...baselineRef.current, [field]: value }
      if (field === "display_label") {
        onLabelResolved?.(value)
      }
    },
    onRefresh,
  })

  const handleFieldChange = React.useCallback(
    (fieldKey: keyof KeyMetadataFields, value: string) => {
      chronicleConfig.markEdited()
      setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    },
    [chronicleConfig],
  )

  const handleCredentialSave = React.useCallback(
    async (apiKey: string) => {
      await saveCredential(apiKey)
      await reload()
    },
    [saveCredential, reload],
  )

  const showRevoke = (key.chronicle_actions ?? []).includes("revoke")

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.display_label || displayLabel,
        status: key.status,
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Display label</p>
        <input
          type="text"
          value={fieldValues.display_label}
          onChange={(e) => handleFieldChange("display_label", e.target.value)}
          placeholder="Key name in Chronicle"
          className="w-full rounded-md border px-3 py-2 text-[14px] bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        />
        {chronicleConfig.fieldErrors.display_label ? (
          <p
            className="text-[13px] mt-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {chronicleConfig.fieldErrors.display_label}
          </p>
        ) : null}
      </div>

      <div className="mb-6">
        <p className="keeper-presence-field-label mb-1.5">Description</p>
        <textarea
          value={fieldValues.description}
          onChange={(e) => handleFieldChange("description", e.target.value)}
          rows={3}
          placeholder="What this key is used for"
          className="w-full resize-y rounded-md border px-3 py-2.5 text-[14px] leading-relaxed bg-transparent outline-none"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
            minHeight: "4.5rem",
          }}
        />
      </div>

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
          onKeyUpdate={handleCredentialSave}
          keyUpdateBusy={rotateBusy}
          keyUpdateError={keySaveError}
          allowValidRotate
        />

        <div className="flex flex-wrap gap-2">
          <ActionButton
            label={verifyBusy ? "Verifying…" : "Verify key"}
            onClick={() => void verify().then(() => reload())}
            disabled={rotateBusy || verifyBusy}
          />
        </div>

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

        {showRevoke && (
          <div className="pt-2">
            <ActionButton
              label="Revoke key"
              onClick={() => void revoke().then(() => reload())}
              disabled={rotateBusy || verifyBusy}
              variant="danger"
            />
          </div>
        )}
      </div>
    </ChronicleConfigShell>
  )
}
