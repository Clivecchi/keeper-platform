"use client"

import type { PresenceBreadcrumb } from "../presenceEnrichment"

function BreadcrumbBar({ breadcrumb }: { breadcrumb: PresenceBreadcrumb }) {
  return (
    <div className="flex items-center gap-1.5 mb-4 min-w-0">
      <span
        className="text-[12px] font-medium truncate"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {breadcrumb.journey}
      </span>
      {breadcrumb.path ? (
        <>
          <span
            className="text-[12px] shrink-0"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
          >
            /
          </span>
          <span
            className="text-[12px] font-medium truncate"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {breadcrumb.path}
          </span>
        </>
      ) : null}
    </div>
  )
}

export function MomentChronicleBlocks({
  narrative,
  breadcrumb,
  metaLine,
}: {
  narrative?: string
  breadcrumb?: PresenceBreadcrumb
  metaLine?: string
}) {
  const body = narrative?.trim() ?? ""

  return (
    <div className="flex flex-col gap-1">
      {breadcrumb ? <BreadcrumbBar breadcrumb={breadcrumb} /> : null}
      {metaLine ? (
        <p
          className="text-[13px] mb-3 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {metaLine}
        </p>
      ) : null}
      {body ? (
        <div className="mb-5">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Story
          </p>
          <p
            className="text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {body}
          </p>
        </div>
      ) : (
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          This moment has no narrative yet — open Edit to add one.
        </p>
      )}
    </div>
  )
}
