"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { MomentBody } from "../frames/moment/MomentBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { createDraftMoment } from "../api/v0Moments"

type SaveStatus = "idle" | "saving" | "saved" | "error"

export function MomentFrame({ styleId = 'neutral', themeSlug, domainSlug, draftId }: { styleId?: StyleId, themeSlug?: string | null, domainSlug?: string, draftId?: string | null }) {
  console.log('MomentFrame rendered with:', { styleId, themeSlug, domainSlug, draftId })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(draftId ?? null)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false)
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveRetryToken, setSaveRetryToken] = useState(0)
  const [bodyBuffer, setBodyBuffer] = useState("")
  const [titleBuffer, setTitleBuffer] = useState("")

  const handleClose = () => {
    navigate(`/d/${domainSlug || 'default'}`)
  }

  useEffect(() => {
    if (draftId) {
      setResolvedDraftId(draftId)
    }
  }, [draftId])

  useEffect(() => {
    if (resolvedDraftId || isBootstrapping) return
    if (!domainSlug) {
      setBootstrapError('Domain is required to start a draft.')
      return
    }

    let isActive = true
    let timeoutId: number | null = null
    ;(async () => {
      try {
        setIsBootstrapping(true)
        setBootstrapError(null)
        setBootstrapTimedOut(false)
        timeoutId = window.setTimeout(() => {
          if (isActive) {
            setBootstrapTimedOut(true)
          }
        }, 2500)
        const draft = await createDraftMoment({
          themeSlug: themeSlug || undefined,
          domainSlug,
        })
        if (!isActive) return
        setBootstrapTimedOut(false)
        setResolvedDraftId(draft.id)

        const next = new URLSearchParams(searchParams)
        next.set('draftId', draft.id)
        setSearchParams(next, { replace: true })
      } catch (error) {
        if (!isActive) return
        console.error('Failed to create draft:', error)
        setBootstrapError('We could not start a draft right now. Please try again.')
      } finally {
        if (timeoutId) {
          window.clearTimeout(timeoutId)
        }
        if (isActive) {
          setIsBootstrapping(false)
        }
      }
    })()

    return () => {
      isActive = false
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [bootstrapAttempt, domainSlug, isBootstrapping, resolvedDraftId, searchParams, setSearchParams, themeSlug])

  const handleRetry = () => {
    setBootstrapError(null)
    setBootstrapTimedOut(false)
    setIsBootstrapping(false)
    setResolvedDraftId(null)
    setBootstrapAttempt((attempt) => attempt + 1)
  }

  const handleStartNew = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('draftId')
    setSearchParams(next, { replace: true })
    handleRetry()
  }

  const showBootstrapBanner = useMemo(() => {
    return Boolean(bootstrapError || bootstrapTimedOut)
  }, [bootstrapError, bootstrapTimedOut])

  const statusConfig = useMemo(() => {
    if (bootstrapError || bootstrapTimedOut || saveStatus === "error") {
      return { label: "Trouble connecting", tone: "text-amber-700 border-amber-200 bg-amber-50" }
    }
    if (isBootstrapping) {
      return { label: "Preparing...", tone: "text-slate-600 border-slate-200 bg-white/80" }
    }
    if (saveStatus === "saving") {
      return { label: "Saving...", tone: "text-slate-600 border-slate-200 bg-white/80" }
    }
    if (saveStatus === "saved") {
      return { label: "Saved", tone: "text-emerald-700 border-emerald-200 bg-emerald-50" }
    }
    return { label: "Saved", tone: "text-slate-600 border-slate-200 bg-white/80" }
  }, [bootstrapError, bootstrapTimedOut, isBootstrapping, saveStatus])

  const showRetry = Boolean(bootstrapError || bootstrapTimedOut || saveStatus === "error")

  const handleStatusRetry = () => {
    if (bootstrapError || bootstrapTimedOut) {
      handleRetry()
      return
    }
    setSaveRetryToken((value) => value + 1)
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Moment Diary"
      subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close moment"
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={handleClose}
    >
      {showBootstrapBanner && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800">
          <div className="font-medium">Draft is taking longer than usual.</div>
          <div className="mt-1 text-[11px] text-amber-700">
            Keep writing. We will sync as soon as the draft is ready.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-amber-800 hover:bg-white"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={handleStartNew}
              className="rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-amber-800 hover:bg-white"
            >
              Start New
            </button>
          </div>
        </div>
      )}

      <MomentBody
        themeSlug={themeSlug}
        domainSlug={domainSlug}
        draftId={resolvedDraftId ?? undefined}
        bodyBuffer={bodyBuffer}
        titleBuffer={titleBuffer}
        onBodyBufferChange={setBodyBuffer}
        onTitleBufferChange={setTitleBuffer}
        onSaveStatusChange={setSaveStatus}
        saveRetryToken={saveRetryToken}
      />

      <div className="mt-3 flex justify-end">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${statusConfig.tone}`}>
          <span>{statusConfig.label}</span>
          {showRetry && (
            <button
              type="button"
              onClick={handleStatusRetry}
              className="rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium text-inherit hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </DesignFrame>
  )
}

