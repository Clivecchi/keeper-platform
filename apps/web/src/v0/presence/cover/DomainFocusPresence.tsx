"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import type { RelatedSection } from "../presenceEnrichment"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DomainConfigPresence } from "./DomainConfigPresence"
import { domainCoverSchema } from "./schemas/domainCoverSchema"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import type { AgentCoverMode } from "./coverTypes"
import { coverFromRecord } from "./coverImageUtils"
import type { ChronicleCoverMedia } from "../chronicleConfig/ChronicleCoverField"
import { useGuidedArrivalOptional } from "../../guidedArrival/GuidedArrivalContext"
import { useFrameLeadAgentIdentity } from "../../hooks/useFrameLeadAgentIdentity"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import { LibrarySharedContextRoadmapPanel } from "../chronicleDocument/LibrarySharedContextRoadmapPanel"

export interface DomainFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  fieldValues: Record<string, string>
  fieldErrors: Record<string, string>
  visibleFields: [string, FieldDefinition][]
  ideBuildContextFields?: [string, FieldDefinition][]
  relatedSections: RelatedSection[]
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onSave: () => void | Promise<void>
  onFieldChange: (key: string, value: string) => void
  onCoverSaved?: () => void
  domainSlug?: string
  onAddressesUpdated?: (patch: {
    customDomain?: string | null
    customDomainVerified?: boolean
  }) => void
  renderFieldEditor: (
    key: string,
    def: FieldDefinition,
    placeholder?: string,
  ) => React.ReactNode
}

export function DomainFocusPresence({
  objectId,
  domainId,
  record,
  fieldValues,
  fieldErrors,
  visibleFields,
  ideBuildContextFields,
  relatedSections,
  saveStatus,
  saveMessage,
  isDirty,
  onSave,
  onFieldChange,
  onCoverSaved,
  domainSlug,
  onAddressesUpdated,
  renderFieldEditor,
}: DomainFocusPresenceProps) {
  const guidedArrival = useGuidedArrivalOptional()
  const v0Shell = useV0ShellOptional()
  const shellLead = v0Shell?.domainData as
    | { leadAgentSlug?: string | null; leadAgentName?: string | null }
    | null
    | undefined
  const declaredLeadSlug =
    (typeof record.leadAgentSlug === "string" ? record.leadAgentSlug.trim() : "") ||
    shellLead?.leadAgentSlug?.trim() ||
    null
  const declaredLeadName =
    (typeof record.leadAgentName === "string" ? record.leadAgentName.trim() : "") ||
    shellLead?.leadAgentName?.trim() ||
    null
  const leadIdentity = useFrameLeadAgentIdentity(
    declaredLeadSlug,
    declaredLeadName ?? "Kip",
    declaredLeadName,
  )
  const primaryAgentName = declaredLeadSlug || declaredLeadName
    ? leadIdentity.displayName
    : null
  const boardCtx = useUniversalBoardOptional()
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")
  const [focusPeople, setFocusPeople] = React.useState(false)
  const [coverRevision, setCoverRevision] = React.useState(0)

  React.useEffect(() => {
    setCoverMode("cover")
    setFocusPeople(false)
  }, [objectId])

  const coverMedia = React.useMemo((): ChronicleCoverMedia => {
    const { coverImage, coverImageKey } = coverFromRecord(record)
    if (!coverImage) return null
    return { type: "image", url: coverImage, key: coverImageKey ?? undefined }
  }, [record, coverRevision])

  const existingTheme = React.useMemo(() => {
    if (record.theme && typeof record.theme === "object" && !Array.isArray(record.theme)) {
      return record.theme as Record<string, unknown>
    }
    return undefined
  }, [record.theme])

  const coverContent = React.useMemo(() => {
    const content = domainCoverSchema.resolve(
      {
        ...record,
        leadAgentName: primaryAgentName,
      },
      fieldValues,
      { objectId },
      {
        onConfigure: () => {
          setFocusPeople(false)
          setCoverMode("config")
        },
        onPeople: () => {
          setFocusPeople(true)
          setCoverMode("config")
        },
        onOpenSession: () => {},
      },
    )
    const arrivalQuote = guidedArrival?.coverGreeting?.trim()
    if (!arrivalQuote) return content
    return {
      ...content,
      identity: {
        ...content.identity,
        voiceQuote: arrivalQuote,
      },
    }
  }, [record, fieldValues, objectId, coverRevision, guidedArrival?.coverGreeting, primaryAgentName])

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {coverMode === "cover" ? (
          <motion.div
            key="cover"
            className="keeper-panel-scroll absolute inset-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />

            {relatedSections.length > 0 && (
              <div className="mt-6">
                {relatedSections.map((section) => (
                  <div key={section.title} className="mb-4">
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      {section.title}
                    </p>
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border px-3 py-2 mb-2"
                        style={{
                          borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                          background: "hsl(var(--theme-surface-elevated) / 0.25)",
                        }}
                      >
                        <p
                          className="text-[13px] font-medium"
                          style={{ color: "hsl(var(--theme-ink-primary))" }}
                        >
                          {item.label}
                        </p>
                        {item.sub && (
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                          >
                            {item.sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {boardCtx?.actions.requestDialogIngest ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => boardCtx.actions.requestDialogIngest()}
                  className="text-[13px] underline underline-offset-2"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  Bring in writing from outside Keeper
                </button>
                <p
                  className="text-[12px] mt-1 leading-snug"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Starts a conversation with sections you can Gloss — not a Library upload.
                </p>
              </div>
            ) : null}
            <LibrarySharedContextRoadmapPanel />
          </motion.div>
        ) : (
          <motion.div
            key={`config-${domainId}`}
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
          <DomainConfigPresence
            domainId={domainId}
            domainSlug={
              fieldValues.slug?.trim() ||
              (typeof record.slug === "string" ? record.slug : domainSlug ?? "")
            }
            primaryAgentName={primaryAgentName}
            customDomain={
              typeof record.customDomain === "string" ? record.customDomain : null
            }
            customDomainVerified={record.customDomainVerified === true}
            onAddressesUpdated={onAddressesUpdated}
            existingTheme={existingTheme}
            coverMedia={coverMedia}
            fieldValues={fieldValues}
            fieldErrors={fieldErrors}
            visibleFields={visibleFields}
            ideBuildContextFields={ideBuildContextFields}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            isDirty={isDirty}
            focusPeople={focusPeople}
            onBack={() => {
              setFocusPeople(false)
              setCoverMode("cover")
            }}
            onSave={() => void onSave()}
            onFieldChange={onFieldChange}
            onCoverSaved={() => {
              setCoverRevision((n) => n + 1)
              onCoverSaved?.()
            }}
            renderFieldEditor={renderFieldEditor}
          />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
