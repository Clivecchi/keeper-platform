"use client"

import * as React from "react"

export interface LibraryBrowseRailProps {
  title: string
  count: number
  children: React.ReactNode
}

export function LibraryBrowseRail({ title, count, children }: LibraryBrowseRailProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h3
          className="font-serif text-[17px] font-semibold tracking-tight"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {title}
        </h3>
        <p
          className="text-[11px] shrink-0"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {count}
        </p>
      </div>
      <div
        className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
        role="list"
        aria-label={title}
      >
        {children}
      </div>
    </section>
  )
}
