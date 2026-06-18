"use client"

import * as React from "react"
import { DocumentIcon, PaperClipIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { PendingAttachment } from "../../../components/agent/AgentComposer"

interface DialogUploadStreamProps {
  attachments: PendingAttachment[]
  isUploading?: boolean
  onRemove: (id: string) => void
}

function attachmentIcon(type: PendingAttachment["type"]) {
  if (type === "image") return PhotoIcon
  if (type === "text") return DocumentIcon
  return PaperClipIcon
}

/**
 * Thinking Space — pending uploads staged before send.
 * Library item is created at pick time; files stay here until the message sends.
 */
export function DialogUploadStream({
  attachments,
  isUploading = false,
  onRemove,
}: DialogUploadStreamProps) {
  if (attachments.length === 0 && !isUploading) {
    return (
      <p className="dialog-upload-idle" aria-hidden="true">
        Attach files to include with your next message…
      </p>
    )
  }

  return (
    <div className="dialog-upload-stream">
      <div className="dialog-upload-stream-head">
        <span className="dialog-upload-stream-label">Ready to send</span>
        {isUploading ? (
          <span className="dialog-upload-stream-status">Uploading…</span>
        ) : (
          <span className="dialog-upload-stream-status">
            {attachments.length} file{attachments.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="dialog-upload-stream-list">
        {attachments.map((attachment) => {
          const Icon = attachmentIcon(attachment.type)
          return (
            <div key={attachment.id} className="dialog-upload-chip">
              {attachment.type === "image" ? (
                <img
                  src={attachment.url}
                  alt=""
                  className="dialog-upload-chip-thumb"
                />
              ) : (
                <Icon className="dialog-upload-chip-icon" aria-hidden />
              )}
              <span className="dialog-upload-chip-name" title={attachment.name}>
                {attachment.name}
              </span>
              <button
                type="button"
                className="dialog-upload-chip-remove"
                onClick={() => onRemove(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
              >
                <XMarkIcon className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DialogUploadStream
