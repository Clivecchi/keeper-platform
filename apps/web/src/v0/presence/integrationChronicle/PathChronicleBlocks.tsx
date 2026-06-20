"use client"

import type { RelatedSection } from "../presenceEnrichment"
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
    </div>
  )
}

function MomentThread({
  label,
  sub,
  preview,
  onClick,
}: {
  label: string
  sub?: string
  preview?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left group rounded-lg border px-3 py-2.5 mb-2 transition-all hover:opacity-90"
      style={{
        cursor: onClick ? "pointer" : "default",
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.28)",
      }}
    >
      <p
        className="text-[14px] font-medium leading-snug"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {label}
      </p>
      {preview ? (
        <p
          className="text-[13px] leading-relaxed mt-1 line-clamp-2"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {preview}
        </p>
      ) : null}
      {sub ? (
        <p
          className="text-[12px] mt-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {sub}
        </p>
      ) : null}
    </button>
  )
}

export function PathChronicleBlocks({
  prelude,
  breadcrumb,
  sections,
  onMomentSelect,
}: {
  prelude?: string
  breadcrumb?: PresenceBreadcrumb
  sections: RelatedSection[]
  onMomentSelect?: (id: string) => void
}) {
  const body = prelude?.trim() ?? ""
  const momentSection = sections.find((s) => s.title === "Moments")

  return (
    <div className="flex flex-col gap-1">
      {breadcrumb ? <BreadcrumbBar breadcrumb={breadcrumb} /> : null}
      {body ? (
        <div className="mb-5">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Prelude
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
          className="text-[14px] leading-relaxed mb-4"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          No prelude yet — open Edit to describe what this path gathers.
        </p>
      )}
      {momentSection ? (
        <div className="mb-5">
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {momentSection.title}
          </p>
          {momentSection.items.length === 0 ? (
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Nothing here yet — but this path is alive.
            </p>
          ) : (
            momentSection.items.map((item) => (
              <MomentThread
                key={item.id}
                label={item.label}
                sub={item.sub}
                preview={item.preview}
                onClick={
                  item.navigateKind === "moment" && onMomentSelect
                    ? () => onMomentSelect(item.id)
                    : undefined
                }
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
