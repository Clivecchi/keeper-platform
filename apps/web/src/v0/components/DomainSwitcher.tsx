"use client"

import * as React from "react"
import type { DomainSwitcherEntry } from "../boards/domain/domainSwitcherData"
import { PlaybillCard } from "./PlaybillCard"

export interface DomainSwitcherProps {
  domains: DomainSwitcherEntry[]
  currentSlug: string
  onSelect: (slug: string) => void
  onAddDomain: () => void
  onClose: () => void
  /** Warm frame + domain payload before navigate (hover). */
  onPrefetchDomain?: (slug: string) => void
}

export function DomainSwitcher({
  domains,
  currentSlug,
  onSelect,
  onAddDomain,
  onClose,
  onPrefetchDomain,
}: DomainSwitcherProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const anchor = document.querySelector(".keeper-topbar-playbill-anchor")
      if (anchor?.contains(event.target as Node)) return
      if (panelRef.current?.contains(event.target as Node)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="keeper-topbar-playbill-dropdown"
      role="menu"
      aria-label="Domain travel"
    >
      <ul role="none" className="playbill-dropdown-list">
        {domains.map((domain) => (
          <li key={domain.slug} role="none">
            <PlaybillCard
              domain={domain}
              isCurrent={domain.slug === currentSlug}
              onSelect={onSelect}
              onClose={onClose}
              onPrefetch={onPrefetchDomain}
              variant="overlay"
            />
          </li>
        ))}
      </ul>

      <div className="playbill-dropdown-footer">
        <button
          type="button"
          onClick={onAddDomain}
          className="playbill-dropdown-add"
          aria-label="Add a domain"
        >
          <span className="playbill-dropdown-add__icon" aria-hidden>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M4 1.5V6.5M1.5 4H6.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="playbill-dropdown-add__label">Add a domain</span>
        </button>
      </div>
    </div>
  )
}
