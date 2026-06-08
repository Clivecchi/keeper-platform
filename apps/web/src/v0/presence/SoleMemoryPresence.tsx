"use client"

import { SoleMemoryChronicle } from "./SoleMemoryChronicle"

export function SoleMemoryPresence({
  memoryCardId,
  domainId,
  onLabelResolved,
}: {
  memoryCardId: string
  domainId: string
  onLabelResolved?: (label: string) => void
}) {
  return (
    <SoleMemoryChronicle
      memoryCardId={memoryCardId}
      domainId={domainId}
      onLabelResolved={onLabelResolved}
    />
  )
}
