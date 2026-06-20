"use client"

import * as React from "react"
import { KipApi, type KipDraftVersion } from "../../../lib/kipApi"

const DEFAULT_VERSION_LIMIT = 5

function formatVersionWhen(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

export function DraftVersionStrip({
  domainId,
  draftId,
  refreshKey = 0,
  limit = DEFAULT_VERSION_LIMIT,
}: {
  domainId: string
  draftId: string
  refreshKey?: number
  limit?: number
}) {
  const [versions, setVersions] = React.useState<KipDraftVersion[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setVersions(null)
    setError(null)
    void KipApi.listDraftVersions(domainId, draftId, limit)
      .then((rows) => {
        if (!cancelled) setVersions(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load versions")
          setVersions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [domainId, draftId, refreshKey, limit])

  if (error) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--destructive))" }}>
        {error}
      </p>
    )
  }

  if (!versions) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Loading versions…
      </p>
    )
  }

  if (versions.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No saved versions yet — updates will appear here.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {versions.map((version) => (
        <li
          key={version.id}
          className="rounded-lg border px-3 py-2.5"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            background: "hsl(var(--theme-surface-elevated) / 0.22)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[13px] font-medium"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              v{version.version}
              {version.title?.trim() ? ` · ${version.title.trim()}` : ""}
            </p>
            <span
              className="text-[11px] shrink-0"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {formatVersionWhen(version.createdAt)}
            </span>
          </div>
          {version.status ? (
            <p
              className="text-[11px] mt-1 capitalize"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {version.status}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
