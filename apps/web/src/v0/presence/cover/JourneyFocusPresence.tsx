"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { apiFetch } from "../../../lib/api"
import { useAuth } from "../../../context/AuthContext"
import type { EngagementContext } from "../../../components/engagement/EngagementForm"
import { useBoardEngagement } from "../../boards/engagement/useBoardEngagement"
import { ChronicleActPresence } from "../chronicleConfig/ChronicleActPresence"
import type { PresenceMeta } from "../presenceEnrichment"
import type { RelatedSection } from "../presenceEnrichment"
import { JourneyChronicleBlocks } from "../integrationChronicle/JourneyChronicleBlocks"
import { JourneyConfigPresence } from "../integrationChronicle/JourneyConfigPresence"
import { EntityCoverPresence } from "./EntityCoverPresence"
import {
  resolveJourneyCoverContent,
  type JourneyCoverRecord,
} from "./schemas/journeyCoverSchema"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import type { EntityCoverMode } from "./coverTypes"

export interface JourneyFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  onLabelResolved?: (label: string) => void
  onMomentSelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onEngagementSuccess?: () => void
}

function toJourneyCoverRecord(
  objectId: string,
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
  isActive: boolean,
): JourneyCoverRecord {
  const paths = Array.isArray(record.paths) ? record.paths.length : undefined
  const stats = record.stats as { totalMoments?: number; totalPaths?: number } | undefined
  const momentCount =
    meta?.momentCount ??
    stats?.totalMoments ??
    (typeof record.momentCount === "number" ? record.momentCount : 0)
  const pathCount =
    stats?.totalPaths ??
    paths ??
    (typeof record.pathCount === "number" ? record.pathCount : 0)

  const createdAt =
    typeof record.createdAt === "string"
      ? record.createdAt
      : typeof record.created_at === "string"
        ? record.created_at
        : undefined

  return {
    id: String(record.id ?? objectId),
    name: typeof record.name === "string" ? record.name : undefined,
    forward:
      typeof record.forward === "string"
        ? record.forward
        : record.forward === null
          ? null
          : undefined,
    createdAt,
    momentCount,
    pathCount,
    keeperTitle: meta?.keeper?.title,
    isActive,
  }
}

export function JourneyFocusPresence({
  objectId,
  domainId,
  record,
  meta,
  relatedSections,
  onLabelResolved,
  onMomentSelect,
  onKeeperSelect,
  onEngagementSuccess,
}: JourneyFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const { isAuthenticated } = useAuth()
  const [coverMode, setCoverMode] = React.useState<EntityCoverMode>("cover")

  const activeJourneyId = boardCtx?.selection.activeJourneyId ?? null
  const isActive = activeJourneyId === objectId

  const keeperId =
    boardCtx?.selection.selectedKeeperId ?? meta?.keeper?.id ?? undefined

  const fieldValues = React.useMemo(
    () => ({
      name: typeof record.name === "string" ? record.name : "",
      forward:
        typeof record.forward === "string"
          ? record.forward
          : record.forward === null
            ? ""
            : "",
    }),
    [record.name, record.forward],
  )

  const journeyRecord = React.useMemo(
    () => toJourneyCoverRecord(objectId, record, meta, isActive),
    [objectId, record, meta, isActive],
  )

  const engagement = useBoardEngagement(() => {
    onEngagementSuccess?.()
    boardCtx?.actions.bumpJourneyNav()
    setCoverMode("cover")
  })

  React.useEffect(() => {
    setCoverMode("cover")
    engagement.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId])

  React.useEffect(() => {
    const label = fieldValues.name.trim()
    if (label) onLabelResolved?.(label)
  }, [fieldValues.name, onLabelResolved])

  const buildEngagementContext = React.useCallback(
    (): EngagementContext => ({
      entityType: "journey",
      entityId: objectId,
      domainId,
      journeyId: objectId,
      keeperId,
    }),
    [domainId, keeperId, objectId],
  )

  const openEngagementAct = React.useCallback(
    async (slug: string) => {
      if (!isAuthenticated) return
      const response = await apiFetch(
        `/api/engagement/templates/${encodeURIComponent(slug)}`,
      )
      if (!response.success || !response.data) return
      engagement.activateTemplate(response.data, buildEngagementContext())
      setCoverMode("act")
    },
    [buildEngagementContext, engagement, isAuthenticated],
  )

  const coverContent = React.useMemo(
    () =>
      resolveJourneyCoverContent(
        journeyRecord,
        fieldValues,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
          onSetActive: isActive
            ? undefined
            : () => boardCtx?.actions.onSetActiveJourney(objectId),
          onEngagementAct: isAuthenticated ? openEngagementAct : undefined,
        },
      ),
    [
      journeyRecord,
      fieldValues,
      objectId,
      isActive,
      isAuthenticated,
      openEngagementAct,
      boardCtx,
    ],
  )

  if (coverMode === "config") {
    return (
      <JourneyConfigPresence
        journeyId={objectId}
        domainId={domainId}
        name={fieldValues.name}
        forward={fieldValues.forward}
        onBack={() => {
          setCoverMode("cover")
          onEngagementSuccess?.()
        }}
        onRefresh={onEngagementSuccess}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  if (coverMode === "act" && engagement.intent) {
    return (
      <ChronicleActPresence
        template={engagement.intent.template}
        context={engagement.intent.context}
        onSubmit={engagement.handleSubmit}
        onClose={() => {
          engagement.cancel()
          setCoverMode("cover")
        }}
        submitting={engagement.submitting}
      />
    )
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        <motion.div
          key="cover"
          className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-4 pt-4 pb-2">
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />
          </div>
          {meta?.keeper?.id && onKeeperSelect ? (
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={() => onKeeperSelect(meta.keeper!.id)}
                className="text-[12px] transition-opacity hover:opacity-80"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                Keeper · {meta.keeper.title}
              </button>
            </div>
          ) : null}
          <div className="px-4 pb-4">
            <JourneyChronicleBlocks
              sections={relatedSections}
              onMomentSelect={onMomentSelect}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
