"use client"

import * as React from "react"
import { ChevronDownIcon } from "@heroicons/react/24/outline"

interface DialogScrollHintProps {
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Matches KeeperDialogFrame auto-scroll target (clears Horizon + Thinking Space). */
  getLatestScrollTop: () => number
}

/**
 * Scroll-to-latest affordance above the Horizon.
 * Appears when the user has scrolled up and newer messages sit below the fold.
 */
export function DialogScrollHint({
  scrollRef,
  getLatestScrollTop,
}: DialogScrollHintProps) {
  const [showHint, setShowHint] = React.useState(false)

  const syncHint = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const canScroll = el.scrollHeight > el.clientHeight + 1
    if (!canScroll) {
      setShowHint(false)
      return
    }

    const target = getLatestScrollTop()
    setShowHint(el.scrollTop < target - 12)
  }, [scrollRef, getLatestScrollTop])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    syncHint()
    el.addEventListener("scroll", syncHint, { passive: true })

    const resizeObserver = new ResizeObserver(syncHint)
    resizeObserver.observe(el)
    for (const child of el.children) {
      resizeObserver.observe(child)
    }

    return () => {
      el.removeEventListener("scroll", syncHint)
      resizeObserver.disconnect()
    }
  }, [scrollRef, syncHint])

  const scrollToLatest = () => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: getLatestScrollTop(), behavior: "smooth" })
  }

  if (!showHint) return null

  return (
    <div className="dialog-scroll-hint">
      <button
        type="button"
        className="dialog-scroll-hint-btn"
        onClick={scrollToLatest}
        aria-label="Scroll to latest messages"
      >
        <ChevronDownIcon className="dialog-scroll-hint-icon" aria-hidden />
        <span>Latest</span>
      </button>
    </div>
  )
}

export default DialogScrollHint
