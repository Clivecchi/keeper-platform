"use client"

import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { MomentBody } from "../frames/moment/MomentBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { createDraftMoment } from "../api/v0Moments"

export function MomentFrame({ styleId = 'neutral', themeSlug, domainSlug, draftId }: { styleId?: StyleId, themeSlug?: string | null, domainSlug?: string, draftId?: string | null }) {
  console.log('MomentFrame rendered with:', { styleId, themeSlug, domainSlug, draftId })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(draftId ?? null)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)

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
    ;(async () => {
      try {
        setIsBootstrapping(true)
        setBootstrapError(null)
        const draft = await createDraftMoment({
          themeSlug: themeSlug || undefined,
          domainSlug,
        })
        if (!isActive) return
        setResolvedDraftId(draft.id)

        const next = new URLSearchParams(searchParams)
        next.set('draftId', draft.id)
        setSearchParams(next, { replace: true })
      } catch (error) {
        if (!isActive) return
        console.error('Failed to create draft:', error)
        setBootstrapError('We could not start a draft right now. Please try again.')
      } finally {
        if (isActive) {
          setIsBootstrapping(false)
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [domainSlug, isBootstrapping, resolvedDraftId, searchParams, setSearchParams, themeSlug])

  const handleRetry = () => {
    setBootstrapError(null)
    setResolvedDraftId(null)
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
      {bootstrapError ? (
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="max-w-md rounded-lg border border-muted bg-white/80 p-6 text-center text-sm text-muted-foreground shadow-sm">
            <div className="text-base font-medium text-foreground">Moment draft unavailable</div>
            <p className="mt-2">{bootstrapError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 inline-flex items-center justify-center rounded-full border border-muted px-4 py-2 text-xs font-medium text-foreground/80 hover:text-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      ) : resolvedDraftId ? (
        <MomentBody themeSlug={themeSlug} domainSlug={domainSlug} draftId={resolvedDraftId} />
      ) : (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-muted-foreground">
          {isBootstrapping ? 'Preparing your draft...' : 'Loading moment editor...'}
        </div>
      )}
    </DesignFrame>
  )
}

