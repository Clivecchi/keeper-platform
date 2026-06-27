"use client"

import * as React from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import type { PendingAttachment } from "./AgentComposer"
import { pastedPreview } from "./composerSupporting"

export interface SupportingDocumentTileProps {
  document: PendingAttachment
  onRemove: (id: string) => void
}

/**
 * Compact composer tile for ephemeral pasted context (Claude-style "PASTED" card).
 * Not saved to Library — sent as supporting context with the next message.
 */
export function SupportingDocumentTile({ document, onRemove }: SupportingDocumentTileProps) {
  const preview = document.pastedContent ? pastedPreview(document.pastedContent, 120) : document.name

  return (
    <div className="keeper-composer-support-tile">
      <div className="keeper-composer-support-tile-body">
        <p className="keeper-composer-support-tile-preview" title={preview}>
          {preview}
        </p>
        <div className="keeper-composer-support-tile-foot">
          <span className="keeper-composer-support-tile-label">Pasted</span>
          <button
            type="button"
            className="keeper-composer-support-tile-remove"
            onClick={() => onRemove(document.id)}
            aria-label="Remove pasted context"
          >
            <XMarkIcon className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
