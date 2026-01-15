"use client"

import type { CSSProperties } from "react"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { X } from "lucide-react"
import { updateDraftMoment, keepMoment, getDraftMoment, createDraftMoment, claimMoment } from "../../api/v0Moments"
import type { DraftMoment } from "../../api/v0Moments"
import type { MomentClaim } from "../../api/v0Moments"
import { useAuth } from "../../../context/AuthContext"

// Config for footer messages - ready for styling later
const momentCopy = {
  preserved: "Your words are being preserved",
  kipPlaceholder: "Kip will assist here.",
}

interface MomentBodyProps {
  /** Theme slug for ruled lines */
  themeSlug?: string | null
  /** Domain slug for navigation */
  domainSlug?: string
  /** Draft ID to load/edit */
  draftId?: string
  /** Callback when moment is kept */
  onMomentKept?: () => void
}

export function MomentBody({ themeSlug, domainSlug, draftId, onMomentKept }: MomentBodyProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  // Determine if we should show ruled lines (diary-paper theme or style)
  const shouldShowRuledLines = themeSlug === 'diary-paper'
  const [content, setContent] = useState("")
  const [title, setTitle] = useState("")
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftId || undefined)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [claimInfo, setClaimInfo] = useState<MomentClaim | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isKipOpen, setIsKipOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isKeeping, setIsKeeping] = useState(false)
  const [isKept, setIsKept] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const lineHeight = 32 // px, keep in sync with ruled lines via --moment-line-step

  // Debounce utility
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  useEffect(() => {
    if (draftId) {
      setActiveDraftId(draftId)
    }
  }, [draftId])

  // Load draft on mount if draftId is provided
  useEffect(() => {
    if (activeDraftId) {
      loadDraft(activeDraftId)
    }
  }, [activeDraftId])

  const loadDraft = async (id: string) => {
    try {
      const draft = await getDraftMoment(id, { domainSlug })
      setContent(draft.body || "")
      setTitle(draft.title || "")
      setIsKept(draft.status === 'kept')
    } catch (error) {
      console.error('Failed to load draft:', error)
      // Continue with empty state if loading fails
    }
  }

  const ensureDraft = useCallback(async () => {
    if (activeDraftId || isCreatingDraft) return
    if (!domainSlug) {
      setSaveError('Domain is required to create a draft.')
      return
    }

    try {
      setIsCreatingDraft(true)
      setSaveError(null)
      const draft = await createDraftMoment({
        themeSlug: themeSlug || undefined,
        title,
        body: content,
        domainSlug
      })
      setActiveDraftId(draft.id)
      setContent(draft.body || "")
      setTitle(draft.title || "")

      const next = new URLSearchParams(searchParams)
      next.set('draftId', draft.id)
      setSearchParams(next, { replace: true })

      if ((content || title) && draft.id) {
        debouncedSave(draft.id, { title, body: content })
      }
    } catch (error) {
      console.error('Failed to create draft:', error)
      setSaveError('Failed to create draft. Please try again.')
    } finally {
      setIsCreatingDraft(false)
    }
  }, [activeDraftId, isCreatingDraft, domainSlug, themeSlug, title, content, searchParams, setSearchParams, debouncedSave])

  useEffect(() => {
    if (!activeDraftId) {
      ensureDraft()
    }
  }, [activeDraftId, ensureDraft])

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (id: string, updates: { title?: string; body?: string }) => {
      if (!id || isKept) return

      try {
        setIsSaving(true)
        setSaveError(null)
        await updateDraftMoment(id, updates, { domainSlug })
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save draft:', error)
        setSaveError('Failed to save. Changes may be lost.')
      } finally {
        setIsSaving(false)
      }
    }, 800),
    [isKept, domainSlug]
  )

  // Handle content changes with autosave
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (activeDraftId) {
      debouncedSave(activeDraftId, { body: newContent })
    }
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (activeDraftId) {
      debouncedSave(activeDraftId, { title: newTitle })
    }
  }

  // Handle keeping the moment
  const handleKeep = async () => {
    if (!activeDraftId || isKeeping) return

    try {
      setIsKeeping(true)
      const result = await keepMoment(activeDraftId, { domainSlug })
      setIsKept(true)
      setLastSaved(new Date())
      if (result.claim) {
        setClaimInfo(result.claim)
      }
      onMomentKept?.()
    } catch (error) {
      console.error('Failed to keep moment:', error)
      setSaveError('Failed to keep moment.')
    } finally {
      setIsKeeping(false)
    }
  }

  const handleClaim = async () => {
    if (!claimInfo?.token) return
    if (!isAuthenticated) {
      setClaimError('Sign in to claim your moment.')
      return
    }
    try {
      setClaimError(null)
      await claimMoment(claimInfo.token)
      setClaimInfo(null)
    } catch (error) {
      console.error('Failed to claim moment:', error)
      setClaimError('Failed to claim moment.')
    }
  }

  const handleViewDomain = () => {
    if (!domainSlug) return
    navigate(`/d/${domainSlug}?frame=moments`)
  }

  return (
    <>
      {/* Main content area */}
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-4xl">
          <div className="space-y-3 mt-2">
            <div
              className="relative rounded-sm border bg-white/92 overflow-hidden flex flex-col"
              style={{
                backgroundColor: "var(--theme-surface-paper)",
                borderColor: "var(--theme-border-soft)",
                boxShadow: "var(--theme-shadow-soft)",
                color: "var(--theme-ink-primary)",
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.35) 0, transparent 40%)",
              }}
            >
            <div
              className="flex-1 overflow-auto"
              style={
                {
                  "--moment-line-step": `${lineHeight}px`,
                  backgroundImage: shouldShowRuledLines
                    ? `repeating-linear-gradient(0deg, transparent, transparent calc(var(--moment-line-step) - 1px), var(--theme-line-ruled) calc(var(--moment-line-step) - 1px), var(--theme-line-ruled) var(--moment-line-step))`
                    : undefined,
                  backgroundAttachment: "local",
                } as CSSProperties
              }
            >
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Begin writing…"
                disabled={isKept}
                className="w-full h-full min-h-[520px] bg-transparent outline-none resize-none px-6 md:px-8 pb-10 text-[15.5px] text-[var(--theme-ink-primary)] placeholder:text-[var(--theme-ink-placeholder)] border border-white disabled:opacity-75"
                style={{
                  lineHeight: "var(--moment-line-step)",
                  paddingTop: "calc(var(--moment-line-step) / 2)",
                  paddingBottom: "calc(var(--moment-line-step))",
                  fontFamily: "var(--font-family-sans, Inter, system-ui, sans-serif)",
                }}
              />
            </div>

            {/* Media Bar */}
            <div
              className="px-6 md:px-8 py-3 border-t box-content"
              style={{
                borderTop: `1px solid rgba(222, 214, 211, 1)`,
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.3)"
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--theme-ink-tertiary)" }}>
                  <span>kept</span>
                  <span className="text-[9px] opacity-60">(0)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleKeep}
                    disabled={isKeeping || isKept || !activeDraftId}
                    className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      borderColor: "var(--theme-border-soft)",
                      color: "var(--theme-ink-tertiary)",
                      backgroundColor: "var(--theme-surface-paper)",
                      boxShadow: "var(--theme-shadow-soft)",
                    }}
                    aria-label="Keep this moment"
                  >
                    <span>{isKeeping ? 'Keeping...' : isKept ? 'Kept ✓' : 'Keep'}</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                    style={{
                      borderColor: "var(--theme-border-soft)",
                      color: "var(--theme-ink-tertiary)",
                      backgroundColor: "var(--theme-surface-paper)",
                      boxShadow: "var(--theme-shadow-soft)",
                    }}
                    aria-label="Upload media"
                  >
                    <span>+</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              className="flex flex-col items-end gap-2 px-6 md:px-8 py-4 text-[11px]"
              style={{ color: "var(--theme-ink-tertiary)", borderTop: `1px solid rgba(210, 174, 162, 1)`, backgroundColor: "rgba(240, 240, 240, 1)" }}
            >
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--theme-surface-paper)",
                  color: "var(--theme-ink-secondary)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                {content.trim().length ? `${content.trim().split(/\s+/).filter(Boolean).length} words ${isKept ? 'kept' : 'written'}` : `0 words ${isKept ? 'kept' : 'written'}`}
              </span>
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--theme-surface-paper)",
                  color: isKept ? "var(--theme-ink-secondary)" : saveError ? "var(--theme-ink-error, #ef4444)" : "var(--theme-ink-tertiary)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                {isKept
                  ? 'Moment kept forever'
                  : saveError
                    ? saveError
                    : isCreatingDraft
                      ? 'Creating draft...'
                      : isSaving
                        ? 'Saving...'
                        : lastSaved
                          ? `Saved ${lastSaved.toLocaleTimeString()}`
                          : momentCopy.preserved}
              </span>
              {isKept && (
                <button
                  type="button"
                  onClick={handleViewDomain}
                  className="inline-flex items-center justify-center rounded-full border px-3 py-2 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                  style={{
                    borderColor: "var(--theme-border-soft)",
                    color: "var(--theme-ink-tertiary)",
                    backgroundColor: "var(--theme-surface-paper)",
                    boxShadow: "var(--theme-shadow-soft)",
                  }}
                  aria-label="View in domain"
                >
                  <span>View in Domain</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsKipOpen(!isKipOpen)}
                className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
                aria-label="Kip companion"
              >
                <span>Kip</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {isKept && claimInfo && (
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-xl rounded-md border p-4 text-xs" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "var(--theme-surface-paper)" }}>
            <div className="font-medium mb-2">Create your Ke3p Key</div>
            <div className="mb-3">Save this claim token to attach your moment to an account later.</div>
            <div className="flex items-center gap-2 mb-3">
              <code className="px-2 py-1 rounded bg-white/60 border" style={{ borderColor: "var(--theme-border-soft)" }}>
                {claimInfo.token}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(claimInfo.token)}
                className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(`mailto:?subject=Your Ke3p Key&body=${encodeURIComponent(claimInfo.token)}`)}
                className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                Email to self
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClaim}
                className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                Claim now
              </button>
              <button
                type="button"
                onClick={() => navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => navigate(`/register?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                Sign up
              </button>
            </div>
            {claimError && (
              <div className="mt-2 text-[11px]" style={{ color: "var(--theme-ink-error, #ef4444)" }}>
                {claimError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kip Companion Panel */}
      {isKipOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsKipOpen(false)}
          />

          {/* Kip Panel */}
          <div
            className="absolute bottom-20 right-6 z-50 w-64 p-4 rounded-md border shadow-lg"
            style={{
              backgroundColor: "var(--theme-surface-paper)",
              borderColor: "var(--theme-border-soft)",
              boxShadow: "var(--theme-shadow-soft)",
              color: "var(--theme-ink-primary)",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--theme-ink-secondary)" }}>
                Kip Companion
              </span>
              <button
                type="button"
                onClick={() => setIsKipOpen(false)}
                className="text-muted-foreground/60 hover:text-foreground p-1"
                aria-label="Close Kip panel"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--theme-ink-tertiary)" }}>
              {momentCopy.kipPlaceholder}
            </p>
          </div>
        </>
      )}
    </>
  )
}