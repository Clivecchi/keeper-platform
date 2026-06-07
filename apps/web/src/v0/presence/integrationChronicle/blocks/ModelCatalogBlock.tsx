"use client"

import { ActionButton, formatRelativeTime } from "../shared"
import { BlockBadge, BlockShell, BlockTitle } from "./blockShell"

export type ModelCatalogBlockProps = {
  modelCount: number
  lastFetched: string | null
  isFallback: boolean
  onRefresh: () => void | Promise<void>
  refreshBusy?: boolean
}

export function ModelCatalogBlock({
  modelCount,
  lastFetched,
  isFallback,
  onRefresh,
  refreshBusy = false,
}: ModelCatalogBlockProps) {
  return (
    <BlockShell>
      <BlockTitle>Available models</BlockTitle>
      <div className="flex flex-wrap gap-2 mb-2">
        <BlockBadge label={`${modelCount} models`} />
        <BlockBadge
          label={isFallback ? "FALLBACK" : "LIVE"}
          tone={isFallback ? "warning" : "success"}
        />
      </div>
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Last fetched {formatRelativeTime(lastFetched ?? undefined)}
      </p>
      <div className="mt-2">
        <ActionButton
          label={refreshBusy ? "Refreshing…" : "Refresh Models"}
          onClick={() => void onRefresh()}
          disabled={refreshBusy}
        />
      </div>
    </BlockShell>
  )
}
