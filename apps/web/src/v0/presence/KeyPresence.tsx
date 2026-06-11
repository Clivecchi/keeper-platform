// RETIRED — key now renders through KeeperPresence → KeyFocusPresence → EntityCoverPresence
// This file is no longer in the render path. Safe to delete after browser verification.

"use client"

import * as React from "react"
import { KeyChronicle } from "./integrationChronicle/KeyChronicle"

export function KeyPresence({
  keyId,
  domainId,
  onLabelResolved,
}: {
  keyId: string
  domainId: string
  onLabelResolved?: (label: string) => void
}) {
  return (
    <KeyChronicle
      keyId={keyId}
      domainId={domainId}
      onLabelResolved={onLabelResolved}
    />
  )
}
