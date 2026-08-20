"use client"

import * as React from "react"
import { formatDocumentStatusLabel } from "./documentHeader"

export interface DocumentHeaderProps {
  title: string
  status?: string | null
  pointCount: number
  componentCount?: number
  onManage?: () => void
  documentControl?: React.ReactNode
}

/**
 * Universal Document identity header — same Chronicle header pattern as Draft (`Cdraft`).
 * Always rendered for a named Dialog Document, including when there are no Points.
 */
export function DocumentHeader({
  title,
  status,
  pointCount,
  componentCount = 0,
  onManage,
  documentControl,
}: DocumentHeaderProps) {
  return (
    <div className="cdraft shrink-0" data-document-header="">
      {onManage ? (
        <div className="cdraft-manage-bar">
          <button type="button" className="cdraft-manage-btn" onClick={onManage}>
            <span className="cdraft-manage-glyph" aria-hidden>
              ⊕
            </span>
            Manage
          </button>
        </div>
      ) : null}

      <header className="cdraft-header">
        <h1 className="cdraft-title">{title}</h1>
        <p className="cdraft-breadcrumb">Document</p>
        <div className="cdraft-meta-strip">
          <span className="cdraft-status-pill">{formatDocumentStatusLabel(status)}</span>
          <span className="cdraft-meta-item">Document</span>
          <span className="cdraft-meta-item">
            {pointCount} {pointCount === 1 ? "point" : "points"}
          </span>
          {componentCount > 0 ? (
            <span className="cdraft-meta-item">
              {componentCount} {componentCount === 1 ? "draft" : "drafts"}
            </span>
          ) : null}
        </div>
        {documentControl ? (
          <div className="cdraft-document-control mt-2">{documentControl}</div>
        ) : null}
      </header>
    </div>
  )
}
