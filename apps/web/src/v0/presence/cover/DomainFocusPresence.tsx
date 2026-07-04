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
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")
  const [coverRevision, setCoverRevision] = React.useState(0)

  React.useEffect(() => {
    setCoverMode("cover")
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
      record,
      fieldValues,
      { objectId },
      { onConfigure: () => setCoverMode("config"), onOpenSession: () => {} },
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
  }, [record, fieldValues, objectId, coverRevision, guidedArrival?.coverGreeting])

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        {coverMode === "cover" ? (
          <motion.div
            key="cover"
            className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4"
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
          </motion.div>
        ) : (
          <DomainConfigPresence
            key="config"
            domainId={domainId}
            domainSlug={
              fieldValues.slug?.trim() ||
              (typeof record.slug === "string" ? record.slug : domainSlug ?? "")
            }
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
            onBack={() => setCoverMode("cover")}
            onSave={() => void onSave()}
            onFieldChange={onFieldChange}
            onCoverSaved={() => {
              setCoverRevision((n) => n + 1)
              onCoverSaved?.()
            }}
            renderFieldEditor={renderFieldEditor}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
