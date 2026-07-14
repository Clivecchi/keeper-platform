"use client"

/**
 * Chronicle Layer 2 — thin registry router.
 *
 * Looks up entity kind in CHRONICLE_ENTITY_REGISTRY and renders focus or config.
 * Unregistered kinds fall through to KeeperPresence via ChroniclePresenceView.
 */

import * as React from "react"
import {
  getChronicleEntitySpec,
  isRegistryEntityKind,
  type ChronicleEntityFocusProps,
} from "./chronicleEntityRegistry"
import type { PresenceLayout } from "./types"

export interface ChronicleEntityViewProps {
  entityKind: string
  entityId: string
  domainId: string
  layout?: PresenceLayout
  record?: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

export function ChronicleEntityView({
  entityKind,
  entityId,
  domainId,
  layout = "focus",
  record: seedRecord,
  onLabelResolved,
}: ChronicleEntityViewProps) {
  if (!isRegistryEntityKind(entityKind)) {
    return null
  }

  const spec = getChronicleEntitySpec(entityKind)
  const [record, setRecord] = React.useState<Record<string, unknown>>(seedRecord ?? {})

  React.useEffect(() => {
    if (seedRecord && Object.keys(seedRecord).length > 0) {
      setRecord(seedRecord)
      return
    }

    let cancelled = false
    void spec.fetchRecord(entityId).then((row) => {
      if (!cancelled && row) {
        setRecord(row)
      }
    })

    return () => {
      cancelled = true
    }
  }, [entityId, seedRecord, spec])

  const focusProps: ChronicleEntityFocusProps = {
    objectId: entityId,
    domainId,
    record,
    onLabelResolved,
  }

  // Library (pilot): config is orchestrated inside focus via coverMode.
  const Focus = spec.focus
  return <Focus {...focusProps} />
}

export { isRegistryEntityKind } from "./chronicleEntityRegistry"
