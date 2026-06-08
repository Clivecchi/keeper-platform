"use client"

import * as React from "react"

interface DialogScrollRailProps {
  scrollRef: React.RefObject<HTMLDivElement | null>
}

const MIN_THUMB_PX = 36

/**
 * Overlay scroll rail for the dialog message surface.
 * Vertically centered on the right — does not consume layout width, so the
 * dialog never shifts when scrolling begins.
 */
export function DialogScrollRail({ scrollRef }: DialogScrollRailProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)
  const [thumbTop, setThumbTop] = React.useState(0)
  const [thumbHeight, setThumbHeight] = React.useState(MIN_THUMB_PX)
  const dragRef = React.useRef<{ pointerId: number; startY: number; startScrollTop: number } | null>(
    null,
  )

  const syncThumb = React.useCallback(() => {
    const el = scrollRef.current
    const track = trackRef.current
    if (!el || !track) return

    const { scrollHeight, clientHeight, scrollTop } = el
    const canScroll = scrollHeight > clientHeight + 1
    setScrollable(canScroll)
    if (!canScroll) return

    const trackHeight = track.clientHeight
    const viewRatio = clientHeight / scrollHeight
    const height = Math.max(MIN_THUMB_PX, trackHeight * viewRatio)
    const maxThumbTop = Math.max(0, trackHeight - height)
    const maxScroll = scrollHeight - clientHeight
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0

    setThumbHeight(height)
    setThumbTop(top)
  }, [scrollRef])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    syncThumb()
    el.addEventListener("scroll", syncThumb, { passive: true })

    const resizeObserver = new ResizeObserver(syncThumb)
    resizeObserver.observe(el)
    for (const child of el.children) {
      resizeObserver.observe(child)
    }

    return () => {
      el.removeEventListener("scroll", syncThumb)
      resizeObserver.disconnect()
    }
  }, [scrollRef, syncThumb])

  const scrollFromPointer = React.useCallback(
    (clientY: number) => {
      const el = scrollRef.current
      const track = trackRef.current
      const drag = dragRef.current
      if (!el || !track || !drag) return

      const trackHeight = track.clientHeight
      const height = Math.max(MIN_THUMB_PX, trackHeight * (el.clientHeight / el.scrollHeight))
      const maxThumbTop = Math.max(0, trackHeight - height)
      const maxScroll = el.scrollHeight - el.clientHeight

      const deltaY = clientY - drag.startY
      const scrollDelta = maxThumbTop > 0 ? (deltaY / maxThumbTop) * maxScroll : 0
      el.scrollTop = Math.min(maxScroll, Math.max(0, drag.startScrollTop + scrollDelta))
    },
    [scrollRef],
  )

  const onThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return

    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: el.scrollTop,
    }
    trackRef.current?.setPointerCapture(event.pointerId)
  }

  const onTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const track = trackRef.current
    if (!el || !track || event.target !== track) return

    const trackRect = track.getBoundingClientRect()
    const trackHeight = track.clientHeight
    const height = Math.max(MIN_THUMB_PX, trackHeight * (el.clientHeight / el.scrollHeight))
    const maxThumbTop = Math.max(0, trackHeight - height)
    const maxScroll = el.scrollHeight - el.clientHeight
    const clickOffset = event.clientY - trackRect.top - height / 2
    const nextTop = Math.min(maxThumbTop, Math.max(0, clickOffset))
    el.scrollTop = maxThumbTop > 0 ? (nextTop / maxThumbTop) * maxScroll : 0
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    scrollFromPointer(event.clientY)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return
    dragRef.current = null
    trackRef.current?.releasePointerCapture(event.pointerId)
  }

  if (!scrollable) return null

  return (
    <div className="dialog-scroll-rail" aria-hidden="true">
      <div
        ref={trackRef}
        className="dialog-scroll-rail-track"
        onPointerDown={onTrackPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="dialog-scroll-rail-thumb"
          style={{ height: thumbHeight, transform: `translateY(${thumbTop}px)` }}
          onPointerDown={onThumbPointerDown}
        />
      </div>
    </div>
  )
}

export default DialogScrollRail
