"use client"

import * as React from "react"
import { DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { PendingAttachment } from "../../../components/agent/AgentComposer"

interface DialogUploadStreamProps {
  attachments: PendingAttachment[]
  onRemove: (id: string) => void
}

function fileExtension(name: string): string {
  const parts = name.split(".")
  if (parts.length < 2) return "FILE"
  return parts[parts.length - 1].slice(0, 5).toUpperCase()
}

function UploadTile({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment
  onRemove: () => void
}) {
  const isImage = attachment.type === "image"

  return (
    <div className="dialog-upload-tile">
      <div className="dialog-upload-tile-preview">
        {isImage ? (
          <img src={attachment.url} alt="" className="dialog-upload-tile-image" />
        ) : (
          <div className="dialog-upload-tile-file">
            <DocumentIcon className="dialog-upload-tile-file-icon" aria-hidden />
            <span className="dialog-upload-tile-ext">{fileExtension(attachment.name)}</span>
          </div>
        )}
        <button
          type="button"
          className="dialog-upload-tile-remove"
          onClick={onRemove}
          aria-label={`Remove ${attachment.name}`}
        >
          <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <span className="dialog-upload-tile-name" title={attachment.name}>
        {attachment.name}
      </span>
    </div>
  )
}

/**
 * Thinking Space — staged uploads before send. Status ("Uploading…") lives on the Horizon.
 */
export function DialogUploadStream({ attachments, onRemove }: DialogUploadStreamProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="dialog-upload-stream">
      <div className="dialog-upload-tiles" aria-label="Files ready to send">
        {attachments.map((attachment) => (
          <UploadTile
            key={attachment.id}
            attachment={attachment}
            onRemove={() => onRemove(attachment.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default DialogUploadStream
