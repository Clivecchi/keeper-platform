"use client"

import * as React from "react"
import type { ObjectThemeBit } from "@keeper/shared"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

const ROLE_LABEL: Record<ObjectThemeBit["role"], string> = {
  cover: "Cover",
  avatar: "Avatar",
  inspiration: "Inspiration",
}

export function ObjectThemeBitsStrip({ bits }: { bits: ObjectThemeBit[] }) {
  if (bits.length === 0) return null

  return (
    <div className="mb-4">
      <p className="keeper-presence-field-label mb-1.5">Object theme</p>
      <p
        className="text-[12px] mb-2 leading-relaxed"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Visual inspirations in upload order — the object theme grows with each upload.
      </p>
      <ol className="flex flex-wrap gap-2 list-none p-0 m-0">
        {bits.map((bit, index) => (
          <li
            key={bit.id}
            className="relative rounded-lg overflow-hidden border"
            style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
            title={`${ROLE_LABEL[bit.role]} · upload ${index + 1}`}
          >
            <img
              src={getBlobProxyUrl(bit.url)}
              alt=""
              className="h-14 w-14 object-cover"
              draggable={false}
            />
            <span
              className="absolute bottom-0 inset-x-0 px-1 py-0.5 text-[8px] font-mono uppercase tracking-wide text-center truncate"
              style={{
                background: "hsl(var(--theme-surface-page) / 0.88)",
                color: "hsl(var(--theme-ink-tertiary))",
              }}
            >
              {index + 1} · {ROLE_LABEL[bit.role]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
