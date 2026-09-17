"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { FieldDefinition } from "../KeeperPresenceDefaults"
import type { RelatedSection } from "../presenceEnrichment"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DomainConfigPresence } from "./DomainConfigPresence"
import { DomainCoverTerrain } from "./DomainCoverTerrain"
import { domainCoverSchema } from "./schemas/domainCoverSchema"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import type { AgentCoverMode } from "./coverTypes"
import { coverFromRecord } from "./coverImageUtils"
import type { ChronicleCoverMedia } from "../chronicleConfig/ChronicleCoverField"
import { useGuidedArrivalOptional } from "../../guidedArrival/GuidedArrivalContext"
import { useFrameLeadAgentIdentity } from "../../hooks/useFrameLeadAgentIdentity"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

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
  onCoverSaved?: (cover?: ChronicleCoverMedia) => void
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
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
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
  onJourneySelect,
  onMomentSelect,
}: DomainFocusPresenceProps) {
  const guidedArrival = useGuidedArrivalOptional()
  const v0Shell = useV0ShellOptional()
  const boardCtx = useUniversalBoardOptional()
  const enterJourney = onJourneySelect ?? boardCtx?.actions.onJourneySelect
  const enterMoment = onMomentSelect ?? boardCtx?.actions.onMomentSelect
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
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")
  const [focusPeople, setFocusPeople] = React.useState(false)
  const [coverRevision, setCoverRevision] = React.useState(0)
  const peopleInviteRequestId = boardCtx?.selection.peopleInviteRequestId ?? 0

  React.useEffect(() => {
    setCoverMode("cover")
    setFocusPeople(false)
  }, [objectId])

  React.useEffect(() => {
    if (peopleInviteRequestId <= 0) return
    setFocusPeople(true)
    setCoverMode("config")
  }, [peopleInviteRequestId])

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
    <div className="keeper-chronicle-stack">
      <AnimatePresence mode="wait" initial={false}>
        {coverMode === "cover" ? (
          <motion.div
            key="cover"
            className="keeper-panel-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />

            <DomainCoverTerrain
              sections={relatedSections}
              onJourneySelect={enterJourney}
              onMomentSelect={enterMoment}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`config-${domainId}`}
            className="keeper-chronicle-stack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
          <DomainConfigPresence
            domainId={domainId}
            domainSlug={
              (typeof record.slug === "string" && record.slug.trim()) ||
              domainSlug ||
              ""
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
            inviteRequestId={peopleInviteRequestId}
            onBack={() => {
              setFocusPeople(false)
              setCoverMode("cover")
            }}
            onSave={() => void onSave()}
            onFieldChange={onFieldChange}
            onCoverSaved={(cover) => {
              setCoverRevision((n) => n + 1)
              onCoverSaved?.(cover)
            }}
            renderFieldEditor={renderFieldEditor}
          />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
