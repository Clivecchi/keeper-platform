"use client"

/**
 * LibraryScreen
 * =============
 * Media browser over Dialog. Rails and poster cards; selected item in Chronicle.
 */

import * as React from "react"
import { Link2, Plus, Search } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { KipApi } from "../../lib/kipApi"
import { useUniversalBoardOptional } from "./UniversalBoardContext"
import { removeCachedBoardNavRow } from "./boardNavDataCache"
import {
  applyLibraryNavRowPatch,
  fetchDomainLibraryBrowseRows,
  libraryItemChronicleTitle,
  type LibraryNavRow,
} from "../presence/integrationChronicle/libraryNavUtils"
import {
  addLibraryUploadFromFile,
  createLibraryItem,
  isLibraryImageFile,
} from "../presence/integrationChronicle/libraryNavCreate"
import { applyDomainVisualFromImage } from "../themes/applyDomainVisualFromImage"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { LibraryBrowseRail } from "./LibraryBrowseRail"
import { LibraryMediaCard } from "./LibraryMediaCard"
import {
  buildLibraryBrowseRails,
  facetEquals,
  filterLibraryBrowseRows,
  listLibraryBrowseChips,
  type LibraryBrowseFacet,
} from "./libraryBrowse"

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

const ALL_FACET: LibraryBrowseFacet = { type: "all" }

export function LibraryScreen({
  domainId,
  selectedLibraryItemId,
  onSelect,
  onClose,
}: LibraryScreenProps) {
  const { user } = useAuth()
  const boardCtx = useUniversalBoardOptional()
  const v0Shell = useV0ShellOptional()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [rows, setRows] = React.useState<LibraryNavRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [facet, setFacet] = React.useState<LibraryBrowseFacet>(ALL_FACET)

  const libraryNavRevision = boardCtx?.selection.libraryNavRevision ?? 0
  const libraryNavRowPatch = boardCtx?.selection.libraryNavRowPatch ?? null

  const applyPatch = React.useCallback(
    (list: LibraryNavRow[]) => applyLibraryNavRowPatch(list, libraryNavRowPatch),
    [libraryNavRowPatch],
  )

  React.useEffect(() => {
    let cancelled = false
    setError(null)
    void fetchDomainLibraryBrowseRows(domainId)
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const activeKeeperId = boardCtx?.selection.selectedKeeperId ?? null
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
        const domainSlug = v0Shell?.domainSlug?.trim()
        if (isLibraryImageFile(file) && domainSlug) {
          try {
            await applyDomainVisualFromImage({
              domainId,
              domainSlug,
              existingTheme: (v0Shell?.domainData?.theme as Record<string, unknown> | undefined) ?? undefined,
              imageUrl: created.url,
              file,
              displayLabel: file.name,
            })
            await v0Shell?.reloadDomainFrame()
          } catch (visualError) {
            console.warn("[LibraryScreen] domain look from upload skipped:", visualError)
          }
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Failed to add upload to library")
      } finally {
        setCreating(false)
      }
    },
    [activeAgentId, activeKeeperId, boardCtx, domainId, onSelect, user?.id, v0Shell],
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

  const visibleRows = React.useMemo(
    () =>
      (rows ?? []).filter(
        (row) => row.id && row.source_ref?.trim() && libraryItemChronicleTitle(row).trim(),
      ),
    [rows],
  )
  const chips = React.useMemo(() => listLibraryBrowseChips(visibleRows), [visibleRows])
  const filteredRows = React.useMemo(
    () => filterLibraryBrowseRows(visibleRows, facet, query),
    [visibleRows, facet, query],
  )
  const rails = React.useMemo(
    () => buildLibraryBrowseRails(visibleRows, query),
    [visibleRows, query],
  )
  const showRails = facet.type === "all" && query.trim() === ""
  const browseRows = showRails ? visibleRows : filteredRows

  React.useEffect(() => {
    if (chips.some((chip) => facetEquals(chip.facet, facet))) return
    setFacet(ALL_FACET)
  }, [chips, facet])

  const renderCard = (row: LibraryNavRow, compact: boolean) => (
    <LibraryMediaCard
      key={row.id}
      row={row}
      title={libraryItemChronicleTitle(row)}
      selected={row.id === selectedLibraryItemId}
      compact={compact}
      onSelect={() => onSelect(row.id)}
      onRequestDelete={() => setConfirmingDeleteId(row.id)}
      deleteConfirming={confirmingDeleteId === row.id}
      onConfirmDelete={() => handleConfirmDelete(row.id)}
      onCancelDelete={() => setConfirmingDeleteId(null)}
    />
  )

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
        className="shrink-0 px-4 pt-3 pb-2 space-y-2.5"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
      >
        <div className="flex items-center justify-between gap-3">
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void handleAddUrl()}
              disabled={creating}
              aria-label="Add URL"
              className="flex items-center justify-center w-8 h-8 rounded-md transition-opacity hover:opacity-60 disabled:opacity-40"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              <Link2 size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={creating}
              aria-label="Upload to library"
              className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                color: "hsl(var(--theme-accent-primary))",
                border: "1px solid hsl(var(--theme-accent-primary) / 0.45)",
              }}
            >
              <Plus size={14} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close library"
              className="flex items-center justify-center w-8 h-8 rounded-md transition-opacity hover:opacity-60"
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
        </div>

        <label className="relative block">
          <Search
            size={13}
            strokeWidth={1.8}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={creating ? "Adding…" : "Find anything in Library"}
            disabled={creating}
            className="w-full rounded-lg pl-8 pr-3 py-1.5 text-[13px] outline-none"
            style={{
              background: "hsl(var(--theme-surface-elevated, var(--theme-surface-panel)) / 0.7)",
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
        </label>

        {chips.length > 1 ? (
          <div
            className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]"
            role="tablist"
            aria-label="Library shelves"
          >
            {chips.map((chip) => {
              const active = facetEquals(facet, chip.facet)
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFacet(chip.facet)}
                  className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
                  style={{
                    color: active
                      ? "hsl(var(--theme-accent-primary))"
                      : "hsl(var(--theme-ink-secondary))",
                    background: active
                      ? "hsl(var(--theme-accent-primary) / 0.12)"
                      : "transparent",
                    border: active
                      ? "1px solid hsl(var(--theme-accent-primary) / 0.45)"
                      : "1px solid hsl(var(--theme-border-soft) / 0.4)",
                  }}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
        {error ? (
          <p className="text-xs px-1" style={{ color: "hsl(var(--destructive))" }}>
            {error}
          </p>
        ) : null}

        {rows === null ? (
          <p className="text-[13px] px-1" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Loading…
          </p>
        ) : visibleRows.length === 0 ? (
          <div className="px-1 py-8 space-y-3">
            <p
              className="font-serif text-[20px] font-semibold"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              Nothing on the shelves yet
            </p>
            <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Upload a file or add a URL. Chronicle will hold the one you select.
            </p>
          </div>
        ) : showRails ? (
          rails.map((rail) => (
            <LibraryBrowseRail key={rail.id} title={rail.title} count={rail.rows.length}>
              {rail.rows.map((row) => (
                <div
                  key={`${rail.id}:${row.id}`}
                  className="snap-start shrink-0 w-[46%] min-w-[148px] max-w-[220px]"
                  role="listitem"
                >
                  {renderCard(row, true)}
                </div>
              ))}
            </LibraryBrowseRail>
          ))
        ) : browseRows.length === 0 ? (
          <p className="text-[13px] px-1" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Nothing matches that search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {browseRows.map((row) => renderCard(row, false))}
          </div>
        )}
      </div>
    </div>
  )
}
