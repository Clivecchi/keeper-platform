"use client"

import type { CSSProperties } from "react"
import { useEffect, useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import { updateDraftMoment, keepMoment, getDraftMoment, claimMoment } from "../../api/v0Moments"
import type { MomentClaim } from "../../api/v0Moments"
import type { MomentFrameJson } from "../../data/domain-frame.types"
import { useAuth } from "../../../context/AuthContext"
import { recordTrailEvent } from "../../stores/trailStore"
import { MomentFeedbackRail } from "./MomentFeedbackRail"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"

interface MomentBodyProps {
  /** Theme slug for ruled lines */
  themeSlug?: string | null
  /** Domain slug for navigation */
  domainSlug?: string
  /** Draft ID to load/edit */
  draftId?: string
  /** Buffered draft body before server sync */
  bodyBuffer?: string
  /** Buffered draft title before server sync */
  titleBuffer?: string
  /** Update buffered body */
  onBodyBufferChange?: (next: string) => void
  /** Update buffered title */
  onTitleBufferChange?: (next: string) => void
  /** Report save status */
  onSaveStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void
  /** Trigger an immediate save retry */
  saveRetryToken?: number
  /** Callback when moment is kept */
  onMomentKept?: () => void
  /** Domain frame moment block for labels and messaging */
  momentFrame?: MomentFrameJson
}

export function MomentBody({
  themeSlug,
  domainSlug,
  draftId,
  bodyBuffer,
  titleBuffer,
  onBodyBufferChange,
  onTitleBufferChange,
  onSaveStatusChange,
  saveRetryToken,
  onMomentKept,
  momentFrame,
}: MomentBodyProps) {
  const navigate = useNavigate()
  const v0Shell = useV0ShellOptional()
  const frameCtx = useFrameContextOptional()
  const { isAuthenticated } = useAuth()

  const momentCopy = {
    preserved: momentFrame?.messaging.writing.preserved ?? "Your words are being preserved",
    kipPlaceholder: momentFrame?.messaging.kip.panel_placeholder ?? "Kip will assist here.",
  }

  // Context-derived values (authoritative from shell)
  const ctxDomainSlug = frameCtx?.domain?.slug ?? domainSlug
  const ctxJourneyId = frameCtx?.selection.activeJourneyId ?? null
  const ctxKeeperId = frameCtx?.selection.activeKeeperId ?? null
  // Determine if we should show ruled lines (diary-paper theme or style)
  const shouldShowRuledLines = themeSlug === 'diary-paper'
  const [internalContent, setInternalContent] = useState("")
  const [internalTitle, setInternalTitle] = useState("")
  const content = bodyBuffer ?? internalContent
  const title = titleBuffer ?? internalTitle
  const setContent = onBodyBufferChange ?? setInternalContent
  const setTitle = onTitleBufferChange ?? setInternalTitle
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(draftId || undefined)
  const [claimInfo, setClaimInfo] = useState<MomentClaim | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isKipOpen, setIsKipOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isKeeping, setIsKeeping] = useState(false)
  const [isKept, setIsKept] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const hasUserEditedRef = useRef(false)
  const lastSyncedDraftIdRef = useRef<string | null>(null)
  const lastRetryTokenRef = useRef<number | undefined>(saveRetryToken)
  const contentRef = useRef(content)
  const titleRef = useRef(title)

  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    titleRef.current = title
  }, [title])

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
      if (!hasUserEditedRef.current && !contentRef.current.trim() && !titleRef.current.trim()) {
        setContent(draft.body || "")
        setTitle(draft.title || "")
      }
      setIsKept(draft.status === 'kept')
    } catch (error) {
      console.error('Failed to load draft:', error)
      // Continue with empty state if loading fails
    }
  }

  const saveNow = useCallback(
    async (id: string, updates: { title?: string; body?: string }) => {
      if (!id || isKept) return
      try {
        setIsSaving(true)
        setSaveError(null)
        await updateDraftMoment(id, updates, { domainSlug })
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save draft:', error)
        setSaveError(momentFrame?.messaging.save_status.save_failed ?? 'Failed to save. Changes may be lost.')
      } finally {
        setIsSaving(false)
      }
    },
    [domainSlug, isKept, momentFrame]
  )

  useEffect(() => {
    if (!activeDraftId) return
    if (lastSyncedDraftIdRef.current === activeDraftId) return
    lastSyncedDraftIdRef.current = activeDraftId
    if (content.trim() || title.trim()) {
      saveNow(activeDraftId, { title, body: content })
    }
  }, [activeDraftId, content, saveNow, title])

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
        setSaveError(momentFrame?.messaging.save_status.save_failed ?? 'Failed to save. Changes may be lost.')
      } finally {
        setIsSaving(false)
      }
    }, 800),
    [isKept, domainSlug, momentFrame]
  )

  // Handle content changes with autosave
  const handleContentChange = (newContent: string) => {
    hasUserEditedRef.current = true
    setContent(newContent)
    if (activeDraftId) {
      debouncedSave(activeDraftId, { body: newContent })
    }
  }

  const handleTitleChange = (newTitle: string) => {
    hasUserEditedRef.current = true
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
      const result = await keepMoment(activeDraftId, {
        domainSlug: ctxDomainSlug,
        journeyId: ctxJourneyId ?? undefined,
        keeperId: ctxKeeperId ?? undefined,
      })
      setIsKept(true)
      setLastSaved(new Date())
      recordTrailEvent(ctxDomainSlug, {
        label: "Moment kept",
        type: "action",
        href: ctxDomainSlug ? (v0Shell ? v0Shell.buildFrameUrl("moments") : `/d/${ctxDomainSlug}/board?frame=moments`) : undefined,
      })
      if (result.claim) {
        setClaimInfo(result.claim)
      }
      onMomentKept?.()
    } catch (error) {
      console.error('Failed to keep moment:', error)
      setSaveError(momentFrame?.messaging.save_status.keep_failed ?? 'Failed to keep moment.')
    } finally {
      setIsKeeping(false)
    }
  }

  const handleClaim = async () => {
    if (!claimInfo?.token) return
    if (!isAuthenticated) {
      setClaimError(momentFrame?.messaging.claim.unauthenticated ?? 'Sign in to claim your moment.')
      return
    }
    try {
      setClaimError(null)
      await claimMoment(claimInfo.token)
      setClaimInfo(null)
    } catch (error) {
      console.error('Failed to claim moment:', error)
      setClaimError(momentFrame?.messaging.claim.failed ?? 'Failed to claim moment.')
    }
  }

  const handleViewDomain = () => {
    if (!ctxDomainSlug) return
    recordTrailEvent(ctxDomainSlug, {
      label: "View in Domain",
      type: "navigation",
      href: v0Shell ? v0Shell.buildFrameUrl("moments") : `/d/${ctxDomainSlug}/board?frame=moments`,
    })
    if (v0Shell) {
      v0Shell.navigateToFrame("moments")
      return
    }
    navigate(`/d/${ctxDomainSlug}/board?frame=moments`)
  }

  useEffect(() => {
    if (!onSaveStatusChange) return
    const status = saveError ? "error" : isSaving ? "saving" : lastSaved ? "saved" : "idle"
    onSaveStatusChange(status)
  }, [isSaving, lastSaved, onSaveStatusChange, saveError])

  useEffect(() => {
    if (saveRetryToken === undefined) return
    if (saveRetryToken === lastRetryTokenRef.current) return
    lastRetryTokenRef.current = saveRetryToken
    if (activeDraftId) {
      saveNow(activeDraftId, { title, body: content })
    }
  }, [activeDraftId, content, saveNow, saveRetryToken, title])

  const trimmedContent = content.trim()
  const wordCount = trimmedContent ? trimmedContent.split(/\s+/).filter(Boolean).length : 0
  const saveStatusLabel = isKept
    ? (momentFrame?.messaging.save_status.kept_forever ?? "Moment kept forever")
    : saveError
      ? saveError
      : isSaving
        ? (momentFrame?.messaging.save_status.saving ?? "Saving...")
        : lastSaved
          ? `Saved ${lastSaved.toLocaleTimeString()}`
          : momentCopy.preserved

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
                placeholder={momentFrame?.messaging.writing.placeholder ?? "Begin writing\u2026"}
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
                  <span>{momentFrame?.messaging.writing.kept_label ?? "kept"}</span>
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
                    aria-label={momentFrame?.messaging.writing.keep_aria_label ?? "Keep this moment"}
                  >
                    <span>{isKeeping ? (momentFrame?.messaging.writing.keeping_button ?? 'Keeping...') : isKept ? (momentFrame?.messaging.writing.kept_button ?? 'Kept \u2713') : (momentFrame?.messaging.writing.keep_button ?? 'Keep')}</span>
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
                    aria-label={momentFrame?.messaging.writing.upload_aria_label ?? "Upload media"}
                  >
                    <span>+</span>
                  </button>
                </div>
              </div>
            </div>

            <MomentFeedbackRail
              statusItems={[
                {
                  id: "word-count",
                  label: `${wordCount} words ${isKept ? "kept" : "written"}`,
                  tone: "muted",
                },
                {
                  id: "save-status",
                  label: saveStatusLabel,
                  tone: isKept ? "muted" : saveError ? "error" : "default",
                },
              ]}
              primaryAction={
                isKept
                  ? {
                      id: "view-domain",
                      label: momentFrame?.messaging.feedback_rail.view_in_domain ?? "View in Domain",
                      onClick: handleViewDomain,
                    }
                  : null
              }
              secondaryActions={[
                {
                  id: "kip-toggle",
                  label: momentFrame?.messaging.feedback_rail.kip_button ?? "Kip",
                  onClick: () => setIsKipOpen((prev) => !prev),
                  variant: "compact",
                  ariaLabel: momentFrame?.messaging.feedback_rail.kip_aria_label ?? "Kip companion",
                },
              ]}
              context={{
                containerClassName: "px-6 md:px-8 py-4",
                containerStyle: {
                  color: "var(--theme-ink-tertiary)",
                  borderTop: "1px solid rgba(210, 174, 162, 1)",
                  backgroundColor: "rgba(240, 240, 240, 1)",
                },
              }}
            />
            </div>
          </div>
        </div>
      </div>

      {isKept && claimInfo && (
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-xl rounded-md border p-4 text-xs" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "var(--theme-surface-paper)" }}>
            <div className="font-medium mb-2">{momentFrame?.messaging.claim.heading ?? "Create your Ke3p Key"}</div>
            <div className="mb-3">{momentFrame?.messaging.claim.body ?? "Save this claim token to attach your moment to an account later."}</div>
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
                {momentFrame?.messaging.claim.copy_button ?? "Copy"}
              </button>
              <button
                type="button"
                onClick={() => window.location.assign(`mailto:?subject=${encodeURIComponent(momentFrame?.messaging.claim.email_subject ?? "Your Ke3p Key")}&body=${encodeURIComponent(claimInfo.token)}`)}
                className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                {momentFrame?.messaging.claim.email_button ?? "Email to self"}
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
                {momentFrame?.messaging.claim.claim_button ?? "Claim now"}
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
                {momentFrame?.messaging.claim.signin_button ?? "Sign in"}
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
                {momentFrame?.messaging.claim.signup_button ?? "Sign up"}
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
                {momentFrame?.messaging.kip.panel_title ?? "Kip Companion"}
              </span>
              <button
                type="button"
                onClick={() => setIsKipOpen(false)}
                className="text-muted-foreground/60 hover:text-foreground p-1"
                aria-label={momentFrame?.messaging.kip.panel_close_aria_label ?? "Close Kip panel"}
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