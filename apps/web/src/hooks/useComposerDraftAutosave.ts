"use client"

import * as React from "react"
import {
  buildComposerDraftKey,
  clearComposerDraft,
  migrateComposerDraft,
  readComposerDraft,
  writeComposerDraft,
  type ComposerDraftScope,
} from "../lib/composerDraftStorage"

export type { ComposerDraftScope }

const AUTOSAVE_DEBOUNCE_MS = 250

export interface UseComposerDraftAutosaveOptions {
  scope: ComposerDraftScope | null
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  /** When true, skip persist/clear — e.g. while a message send is in flight. */
  isSending?: boolean
  enabled?: boolean
}

export interface UseComposerDraftAutosaveResult {
  /** Clears stored draft for the active scope (and pending bucket when session-bound). */
  clearSavedDraft: () => void
  /** Re-applies stored draft to the composer (e.g. after a failed send). */
  restoreSavedDraft: () => void
}

function resolveDraftForScope(scope: ComposerDraftScope): string | null {
  if (scope.sessionId) {
    migrateComposerDraft({ ...scope, sessionId: null }, scope)
  }
  return readComposerDraft(buildComposerDraftKey(scope))
}

export function useComposerDraftAutosave({
  scope,
  input,
  setInput,
  isSending = false,
  enabled = true,
}: UseComposerDraftAutosaveOptions): UseComposerDraftAutosaveResult {
  const scopeKey = scope ? buildComposerDraftKey(scope) : null
  const lastRestoredKeyRef = React.useRef<string | null>(null)

  const clearSavedDraft = React.useCallback(() => {
    if (!scope) return
    clearComposerDraft(buildComposerDraftKey(scope))
    if (scope.sessionId) {
      clearComposerDraft(buildComposerDraftKey({ ...scope, sessionId: null }))
    }
  }, [scope])

  const restoreSavedDraft = React.useCallback(() => {
    if (!scope) return
    const draft = resolveDraftForScope(scope)
    if (draft != null) setInput(draft)
  }, [scope, setInput])

  React.useEffect(() => {
    if (!enabled || !scope || !scopeKey) return
    if (lastRestoredKeyRef.current === scopeKey) return
    lastRestoredKeyRef.current = scopeKey

    const draft = resolveDraftForScope(scope)
    if (draft != null) setInput(draft)
  }, [enabled, scope, scopeKey, setInput])

  React.useEffect(() => {
    if (!enabled || !scope || !scopeKey || isSending) return

    if (!input.trim()) {
      clearComposerDraft(scopeKey)
      return
    }

    const timer = window.setTimeout(() => {
      writeComposerDraft(scopeKey, input)
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [enabled, input, isSending, scope, scopeKey])

  return { clearSavedDraft, restoreSavedDraft }
}
