"use client"

import * as React from "react"
import { DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { PendingAttachment } from "../../../components/agent/AgentComposer"
import { isPastedSupportingDoc } from "../../../components/agent/composerSupporting"
import { SupportingDocumentTile } from "../../../components/agent/SupportingDocumentTile"

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

  const pastedDocs = attachments.filter(isPastedSupportingDoc)
  const uploadDocs = attachments.filter((a) => !isPastedSupportingDoc(a))

  return (
    <div className="dialog-upload-stream">
      {pastedDocs.length > 0 && (
        <div
          className="dialog-upload-stream-pasted"
          aria-label="Pasted supporting documents ready to send"
        >
          {pastedDocs.map((doc) => (
            <SupportingDocumentTile key={doc.id} document={doc} onRemove={onRemove} />
          ))}
        </div>
      )}
      {uploadDocs.length > 0 && (
        <>
          <div className="dialog-upload-tiles" aria-label="Files ready to send">
            {uploadDocs.map((attachment) => (
              <UploadTile
                key={attachment.id}
                attachment={attachment}
                onRemove={() => onRemove(attachment.id)}
              />
            ))}
          </div>
          {uploadDocs.some((attachment) => attachment.type === "image") ? (
            <p className="dialog-upload-stream-hint">
              Type your question, then press Enter or Send — the image goes with your message.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export default DialogUploadStream
