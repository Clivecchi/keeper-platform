"use client"

import * as React from "react"
import { Archive, FileText, Film, Github, Image as ImageIcon, Link2, PenLine, Trash2 } from "lucide-react"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { InlineDeleteRow } from "../components/InlineDeleteRow"
import type { LibraryNavRow } from "../presence/integrationChronicle/libraryNavUtils"
import {
  isLibraryArchived,
  isLibraryImageSource,
  libraryBrowseKindLabel,
  libraryLinkHost,
  resolveLibraryBrowseKind,
  type LibraryBrowseKind,
} from "./libraryBrowse"

export interface LibraryMediaCardProps {
  row: LibraryNavRow
  title: string
  selected: boolean
  compact?: boolean
  onSelect: () => void
  onRequestDelete: () => void
  deleteConfirming: boolean
  onConfirmDelete: () => Promise<void>
  onCancelDelete: () => void
}

function kindIcon(kind: LibraryBrowseKind) {
  switch (kind) {
    case "image":
      return ImageIcon
    case "video":
      return Film
    case "document":
      return FileText
    case "link":
      return Link2
    case "writing":
      return PenLine
    case "github":
      return Github
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function LibraryMediaCard({
  row,
  title,
  selected,
  compact = false,
  onSelect,
  onRequestDelete,
  deleteConfirming,
  onConfirmDelete,
  onCancelDelete,
}: LibraryMediaCardProps) {
  const kind = resolveLibraryBrowseKind(row)
  const archived = isLibraryArchived(row)
  const thumbSrc = isLibraryImageSource(row) ? getBlobProxyUrl(row.source_ref) : null
  const [thumbFailed, setThumbFailed] = React.useState(false)
  const showThumb = Boolean(thumbSrc) && !thumbFailed
  const Icon = archived ? Archive : kindIcon(kind)
  const kindLabel = archived ? "Archive" : libraryBrowseKindLabel(kind)
  const subtitle =
    kind === "link" ? libraryLinkHost(row.source_ref) : row.description?.trim() || null

  React.useEffect(() => {
    setThumbFailed(false)
  }, [row.source_ref])

  if (deleteConfirming) {
    return (
      <div className="min-h-[8.5rem]">
        <InlineDeleteRow
          label={`Delete library item "${title}"?`}
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      </div>
    )
  }

  return (
    <div className="relative group h-full">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${title} · ${kindLabel}`}
        className="block w-full overflow-hidden rounded-xl text-left transition-opacity hover:opacity-95"
        style={{
          background: "hsl(var(--theme-surface-elevated, var(--theme-surface-panel)) / 0.88)",
          border: selected
            ? "1.5px solid hsl(var(--theme-accent-primary))"
            : "1px solid hsl(var(--theme-border-soft) / 0.45)",
          boxShadow: selected ? "0 0 0 1px hsl(var(--theme-accent-primary) / 0.28)" : undefined,
        }}
      >
        <div className={`relative overflow-hidden ${compact ? "aspect-[16/10]" : "aspect-[16/11]"}`}>
          {showThumb ? (
            <img
              src={thumbSrc ?? undefined}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
              draggable={false}
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
              style={{
                background: `radial-gradient(
                  ellipse 80% 70% at 50% 40%,
                  hsl(var(--theme-accent-primary) / 0.16) 0%,
                  hsl(var(--theme-surface-paper) / 0.92) 70%
                )`,
              }}
            >
              <Icon
                size={compact ? 22 : 26}
                strokeWidth={1.4}
                style={{ color: "hsl(var(--theme-accent-primary) / 0.85)" }}
              />
            </div>
          )}

          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              background: `linear-gradient(
                to top,
                hsl(var(--theme-surface-paper) / 0.96) 0%,
                hsl(var(--theme-surface-paper) / 0.42) 42%,
                transparent 74%
              )`,
            }}
          />

          <div className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2 pt-8">
            <p
              className="text-[8px] font-semibold uppercase tracking-[0.16em] truncate mb-0.5"
              style={{ color: "hsl(var(--theme-accent-primary))" }}
            >
              {kindLabel}
            </p>
            <p
              className="font-serif text-[13px] font-semibold leading-snug line-clamp-2"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {title}
            </p>
            {subtitle ? (
              <p
                className="mt-0.5 text-[10px] leading-snug line-clamp-1"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onRequestDelete()
        }}
        aria-label={`Delete ${title}`}
        className={`absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-7 h-7 rounded-md transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
        style={{
          color: "hsl(var(--theme-ink-secondary))",
          background: "hsl(var(--theme-surface-paper) / 0.82)",
        }}
      >
        <Trash2 size={12} strokeWidth={1.8} />
      </button>
    </div>
  )
}
