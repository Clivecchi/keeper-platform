"use client"

import * as React from "react"
import {
  buildAgentChroniclePatchBody,
  handleChronicleSave,
  splitDomainChroniclePatch,
  type ChronicleSaveContext,
} from "./chroniclePatch"
import type { ChronicleEntityKind, ChronicleSaveStatus } from "./types"

export type { ChronicleSaveStatus, ChronicleEntityKind } from "./types"
export { handleChronicleSave } from "./chroniclePatch"
export { ChronicleSaveBar } from "./ChronicleSaveBar"
export { ChronicleConfigShell } from "./ChronicleConfigShell"

export interface UseChronicleConfigOptions {
  entityKind: ChronicleEntityKind
  entityId: string | null
  domainId: string | null
  domainSlug?: string
  /** Build the PATCH payload from current field state. Return null to skip save. */
  buildPayload: () => Record<string, unknown> | null
  /** Optional validation — return error message to block save. */
  validate?: () => string | null
  patchKeys?: () => string[]
  onSaved?: (field: string, value: unknown) => void
  onRefresh?: () => void
}

export interface UseChronicleConfigResult {
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>
  markEdited: () => void
  clearDirty: () => void
  handleSave: () => Promise<void>
  setSaveStatus: React.Dispatch<React.SetStateAction<ChronicleSaveStatus>>
  setSaveMessage: React.Dispatch<React.SetStateAction<string | null>>
  setFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  fieldErrors: Record<string, string>
  resetSaveState: () => void
}

export function useChronicleConfig({
  entityKind,
  entityId,
  domainId,
  domainSlug,
  buildPayload,
  validate,
  patchKeys,
  onSaved,
  onRefresh,
}: UseChronicleConfigOptions): UseChronicleConfigResult {
  const [saveStatus, setSaveStatus] = React.useState<ChronicleSaveStatus>("idle")
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null)
  const [isDirty, setIsDirty] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  const markEdited = React.useCallback(() => {
    setIsDirty(true)
  }, [])

  const clearDirty = React.useCallback(() => {
    setIsDirty(false)
  }, [])

  const resetSaveState = React.useCallback(() => {
    setSaveStatus("idle")
    setSaveMessage(null)
    setIsDirty(false)
    setFieldErrors({})
  }, [])

  const handleSave = React.useCallback(async () => {
    if (!entityId || !domainId) return

    const validationError = validate?.()
    if (validationError) {
      if (entityKind === "agent" && validationError.includes("Lens")) {
        setFieldErrors((prev) => ({
          ...prev,
          lensSystemPrompt: "Agent voice must be at least 10 characters.",
        }))
      }
      setSaveStatus("error")
      setSaveMessage(validationError)
      return
    }

    const rawPayload = buildPayload()
    if (!rawPayload) {
      // incomplete — no feedback on unchanged save
      return
    }

    const ctx: ChronicleSaveContext = { domainId, domainSlug }
    const keys = patchKeys?.() ?? Object.keys(rawPayload)

    setSaveStatus("saving")
    setSaveMessage(null)

    let payload = rawPayload
    let framePayload: Record<string, unknown> | undefined

    if (entityKind === "agent") {
      payload = buildAgentChroniclePatchBody(rawPayload, domainId)
      if (Object.keys(payload).length <= 1) {
        // incomplete — no feedback on unchanged save
        setSaveStatus("idle")
        setSaveMessage(null)
        return
      }
    }

    if (entityKind === "domain") {
      const stringPatch: Record<string, string> = {}
      for (const [k, v] of Object.entries(rawPayload)) {
        if (typeof v === "string") stringPatch[k] = v
      }
      const split = splitDomainChroniclePatch(stringPatch)
      payload = split.domainBody
      framePayload =
        Object.keys(split.frameBody).length > 0 ? split.frameBody : undefined
    }

    const result = await handleChronicleSave(
      entityKind,
      entityId,
      payload,
      ctx,
      { patchKeys: keys, framePayload },
    )

    if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors! }))
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev }
        for (const key of keys) delete next[key]
        return next
      })
    }

    setSaveStatus(result.status)
    setSaveMessage(result.message)

    if (result.status === "saved") {
      clearDirty()
      if (onSaved) {
        for (const [k, v] of Object.entries(rawPayload)) onSaved(k, v)
      }
      onRefresh?.()
    }
  }, [
    entityKind,
    entityId,
    domainId,
    domainSlug,
    buildPayload,
    validate,
    patchKeys,
    onSaved,
    onRefresh,
    clearDirty,
  ])

  return {
    saveStatus,
    saveMessage,
    isDirty,
    setIsDirty,
    markEdited,
    clearDirty,
    handleSave,
    setSaveStatus,
    setSaveMessage,
    fieldErrors,
    setFieldErrors,
    resetSaveState,
  }
}
