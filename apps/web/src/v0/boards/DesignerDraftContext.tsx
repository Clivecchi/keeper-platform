"use client"

/**
 * DesignerDraftContext
 * ====================
 * KE3P · Keeper Platform · Universal Board — Designer Draft State
 *
 * Thin shared state bus for designer draft lifecycle.
 * Provided by UniversalBoard (above all three panels) so that:
 *   - UniversalConversation (center) WRITES draft state via setters
 *   - UniversalSwitcherPanel (left) READS draftSpecJson for status dots
 *   - DesignBoardFrameDetail (right) READS draftSpecJson + liveDomainFrame,
 *     and WRITES via setters for direct canvas edits
 *
 * This is not designer-board-specific logic. It is the universal layer's
 * "draft preview bus" that only becomes active when kipMode === "designer".
 * All non-designer boards leave the context at its initial null/false values.
 */

import * as React from "react"
import type { DomainFrameJson } from "../data/domain-frame.types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignerDraftContextValue {
  draftSpecJson: DomainFrameJson | null
  draftId: string | null
  isPublishing: boolean
  publishSuccess: boolean
  /** Live domain frame — synced from V0Shell by UniversalConversation in designer mode. */
  liveDomainFrame: DomainFrameJson | null
  setDraftSpecJson: React.Dispatch<React.SetStateAction<DomainFrameJson | null>>
  setDraftId: React.Dispatch<React.SetStateAction<string | null>>
  setIsPublishing: React.Dispatch<React.SetStateAction<boolean>>
  setPublishSuccess: React.Dispatch<React.SetStateAction<boolean>>
  setLiveDomainFrame: React.Dispatch<React.SetStateAction<DomainFrameJson | null>>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DesignerDraftCtx = React.createContext<DesignerDraftContextValue | null>(null)

export function useDesignerDraft(): DesignerDraftContextValue {
  const ctx = React.useContext(DesignerDraftCtx)
  if (!ctx) throw new Error("useDesignerDraft must be used within DesignerDraftProvider")
  return ctx
}

/** Returns null when outside a DesignerDraftProvider — safe for non-designer contexts. */
export function useDesignerDraftOptional(): DesignerDraftContextValue | null {
  return React.useContext(DesignerDraftCtx)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DesignerDraftProvider({ children }: { children: React.ReactNode }) {
  const [draftSpecJson, setDraftSpecJson] = React.useState<DomainFrameJson | null>(null)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)
  const [liveDomainFrame, setLiveDomainFrame] = React.useState<DomainFrameJson | null>(null)

  const value = React.useMemo<DesignerDraftContextValue>(
    () => ({
      draftSpecJson,
      draftId,
      isPublishing,
      publishSuccess,
      liveDomainFrame,
      setDraftSpecJson,
      setDraftId,
      setIsPublishing,
      setPublishSuccess,
      setLiveDomainFrame,
    }),
    [draftSpecJson, draftId, isPublishing, publishSuccess, liveDomainFrame],
  )

  return <DesignerDraftCtx.Provider value={value}>{children}</DesignerDraftCtx.Provider>
}
