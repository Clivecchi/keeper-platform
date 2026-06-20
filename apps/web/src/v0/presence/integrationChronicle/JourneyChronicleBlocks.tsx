"use client"

import type { RelatedSection } from "../presenceEnrichment"

function BlockSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function PathCard({
  label,
  preview,
  sub,
}: {
  label: string
  preview?: string
  sub?: string
}) {
  return (
    <div
      className="w-full text-left rounded-lg border px-3 py-2.5 mb-2"
      style={{
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
          className="text-[13px] leading-relaxed mt-1"
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

export function JourneyChronicleBlocks({
  sections,
  onMomentSelect,
}: {
  sections: RelatedSection[]
  onMomentSelect?: (id: string) => void
}) {
  if (sections.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {sections.map((section) => (
        <BlockSection key={section.title} title={section.title}>
          {section.title === "Paths" ? (
            section.items.length === 0 ? null : (
              section.items.map((item) => (
                <PathCard
                  key={item.id}
                  label={item.label}
                  preview={item.preview}
                  sub={item.sub}
                />
              ))
            )
          ) : section.items.length === 0 ? (
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Nothing here yet — but this journey is alive.
            </p>
          ) : (
            section.items.map((item) => (
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
        </BlockSection>
      ))}
    </div>
  )
}
