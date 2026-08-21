"use client"

/**
 * LibraryScreen
 * =============
 * Opens over Dialog from the Universal Nav Library link.
 * Selecting an item renders it in Chronicle. X closes the screen.
 */

import * as React from "react"
import { useAuth } from "../../context/AuthContext"
import { KipApi } from "../../lib/kipApi"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import { useUniversalBoardOptional } from "./UniversalBoardContext"
import { removeCachedBoardNavRow } from "./boardNavDataCache"
import {
  applyLibraryNavRowPatch,
  fetchDomainLibraryNavRows,
  libraryItemChronicleTitle,
  type LibraryNavRow,
} from "../presence/integrationChronicle/libraryNavUtils"
import {
  addLibraryUploadFromFile,
  createLibraryItem,
} from "../presence/integrationChronicle/libraryNavCreate"

export interface LibraryScreenProps {
  domainId: string
  selectedLibraryItemId?: string | null
  onSelect: (id: string) => void
  onClose: () => void
}

function countLabel(n: number | null, singular: string): string {
  if (n === null) return "Loading…"
  return `${n} ${n === 1 ? singular : `${singular}s`}`
}

export function LibraryScreen({
  domainId,
  selectedLibraryItemId,
  onSelect,
  onClose,
}: LibraryScreenProps) {
  const { user } = useAuth()
  const boardCtx = useUniversalBoardOptional()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [rows, setRows] = React.useState<LibraryNavRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<string | null>(null)

  const libraryNavRevision = boardCtx?.selection.libraryNavRevision ?? 0
  const libraryNavRowPatch = boardCtx?.selection.libraryNavRowPatch ?? null

  const applyPatch = React.useCallback(
    (list: LibraryNavRow[]) => applyLibraryNavRowPatch(list, libraryNavRowPatch),
    [libraryNavRowPatch],
  )

  React.useEffect(() => {
    let cancelled = false
    setError(null)
    void fetchDomainLibraryNavRows(domainId)
      .then((list) => {
        if (!cancelled) setRows(applyPatch(list))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load library")
          setRows([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [domainId, libraryNavRevision, applyPatch])

  React.useEffect(() => {
    if (!libraryNavRowPatch) return
    setRows((prev) => (prev ? applyPatch(prev) : prev))
  }, [libraryNavRevision, libraryNavRowPatch, applyPatch])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const activeKeeperId =
    boardCtx?.selection.selectedKeeperId ?? null
  const activeAgentId = boardCtx?.selection.selectedAgentId ?? null

  const handleUploadClick = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      if (!user?.id) {
        alert("Sign in to upload library files.")
        return
      }
      setCreating(true)
      try {
        const created = await addLibraryUploadFromFile({
          domainId,
          userId: user.id,
          file,
          activeKeeperId,
          activeAgentId,
        })
        onSelect(created.id)
        boardCtx?.actions.bumpLibraryNav()
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to add upload to library")
      } finally {
        setCreating(false)
      }
    },
    [activeAgentId, activeKeeperId, boardCtx, domainId, onSelect, user?.id],
  )

  const handleAddUrl = React.useCallback(async () => {
    if (!user?.id) {
      alert("Sign in to add library links.")
      return
    }
    const url = window.prompt("Paste a URL to add to the library:")
    if (!url?.trim()) return
    setCreating(true)
    try {
      const created = await createLibraryItem({
        domainId,
        userId: user.id,
        sourceType: "url",
        sourceRef: url.trim(),
        activeKeeperId,
        activeAgentId,
      })
      onSelect(created.id)
      boardCtx?.actions.bumpLibraryNav()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to add URL to library")
    } finally {
      setCreating(false)
    }
  }, [activeAgentId, activeKeeperId, boardCtx, domainId, onSelect, user?.id])

  const handleConfirmDelete = React.useCallback(
    async (itemId: string) => {
      await KipApi.deleteLibraryItem(itemId)
      setRows((prev) => (prev ? prev.filter((row) => row.id !== itemId) : prev))
      removeCachedBoardNavRow(domainId, "library", itemId)
      setConfirmingDeleteId(null)
      if (selectedLibraryItemId === itemId) {
        boardCtx?.actions.clearSelection()
      }
    },
    [boardCtx, domainId, selectedLibraryItemId],
  )

  const visibleRows = (rows ?? []).filter(
    (row) => row.id && row.source_ref?.trim() && libraryItemChronicleTitle(row).trim(),
  )

  const items: SidebarCardItem[] = visibleRows.map((row) => ({
    id: row.id,
    label: libraryItemChronicleTitle(row),
    isSelected: row.id === selectedLibraryItemId,
    onClick: () => onSelect(row.id),
    onRequestDelete: () => setConfirmingDeleteId(row.id),
    deleteConfirming: confirmingDeleteId === row.id,
    onConfirmDelete: () => handleConfirmDelete(row.id),
    onCancelDelete: () => setConfirmingDeleteId(null),
    deleteConfirmLabel: `Delete library item "${libraryItemChronicleTitle(row)}"?`,
  }))

  if (!creating) {
    items.push({
      id: "__library_add_url__",
      label: "Add URL…",
      onClick: () => void handleAddUrl(),
    })
  }

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col overflow-hidden"
      style={{
        background: "hsl(var(--theme-surface-paper) / 0.97)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        color: "hsl(var(--theme-ink-primary))",
        borderRadius: "8px",
        border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
      }}
      role="dialog"
      aria-label="Library"
      aria-modal="true"
    >
      <div
        className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
      >
        <div className="min-w-0">
          <p
            className="keeper-nav-section-title text-[13px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-accent-primary))" }}
          >
            Library
          </p>
          <p
            className="text-[12px] mt-0.5"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {rows === null ? "Loading…" : countLabel(visibleRows.length, "item")}
            {" · selected item in Chronicle"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close library"
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md transition-opacity hover:opacity-60"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <SidebarCard
          className="keeper-sidebar-card"
          title="Sources"
          description={
            creating
              ? "Adding…"
              : rows === null
                ? "Loading…"
                : countLabel(visibleRows.length, "item")
          }
          items={items.length ? items : undefined}
          onAdd={creating ? undefined : handleUploadClick}
        />
        {error ? (
          <p className="text-xs px-1" style={{ color: "hsl(var(--destructive))" }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
