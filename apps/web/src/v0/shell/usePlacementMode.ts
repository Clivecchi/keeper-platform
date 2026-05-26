import { useMemo } from "react"
import type { NavigateFunction } from "react-router-dom"
import type { V0FrameKey } from "./V0ShellContext"

export type PlacementMode = "publicStory" | "commons" | "kipFocus" | "admin"

export type PlacementState = {
  mode: PlacementMode
  frame: V0FrameKey
  isAuthenticated: boolean
  isAdmin: boolean
}

export type PlacementActions = {
  openKip: () => void
  closeKip: () => void
  goCommons: () => void
  goAdmin: () => void
  goCover: () => void
  goIndex: () => void
}

type PlacementModeParams = {
  domainSlug: string
  pathname: string
  isAuthenticated: boolean
  isAdmin: boolean
  requestedFrame: V0FrameKey
  buildFrameUrl: (frame: V0FrameKey) => string
  navigate: NavigateFunction
}

const PRIVATE_FRAMES = new Set<V0FrameKey>(["commons", "profile", "admin"])
const KIP_FRAMES = new Set<V0FrameKey>(["kip", "agent"])
/** Guest visitors must not render Agent Studio — cover + companion instead. */
const GUEST_AGENT_FRAMES = new Set<V0FrameKey>(["kip", "agent"])

function resolveFrame(requestedFrame: V0FrameKey, isAuthenticated: boolean): V0FrameKey {
  if (!isAuthenticated && PRIVATE_FRAMES.has(requestedFrame)) {
    return "cover"
  }
  if (!isAuthenticated && GUEST_AGENT_FRAMES.has(requestedFrame)) {
    return "cover"
  }
  return requestedFrame
}

function deriveMode(pathname: string, frame: V0FrameKey, isAuthenticated: boolean): PlacementMode {
  if (pathname.endsWith("/admin") || frame === "admin") {
    return "admin"
  }
  if (KIP_FRAMES.has(frame)) {
    return "kipFocus"
  }
  if (frame === "commons" && isAuthenticated) {
    return "commons"
  }
  return "publicStory"
}

export function usePlacementMode({
  domainSlug,
  pathname,
  isAuthenticated,
  isAdmin,
  requestedFrame,
  buildFrameUrl,
  navigate
}: PlacementModeParams): { state: PlacementState; actions: PlacementActions } {
  const frame = useMemo(() => resolveFrame(requestedFrame, isAuthenticated), [requestedFrame, isAuthenticated])
  const mode = useMemo(() => deriveMode(pathname, frame, isAuthenticated), [pathname, frame, isAuthenticated])

  const actions = useMemo<PlacementActions>(() => {
    return {
      openKip: () => {
        if (!isAuthenticated) {
          const params = new URLSearchParams()
          params.set("frame", "cover")
          params.set("companion", "1")
          navigate(`/d/${domainSlug}?${params.toString()}`)
          return
        }
        navigate(buildFrameUrl("agent"))
      },
      closeKip: () => navigate(buildFrameUrl(isAuthenticated ? "commons" : "cover")),
      goCommons: () => navigate(buildFrameUrl("commons")),
      goAdmin: () => navigate(buildFrameUrl("admin")),
      goCover: () => navigate(buildFrameUrl("cover")),
      goIndex: () => navigate(buildFrameUrl("index"))
    }
  }, [buildFrameUrl, domainSlug, isAuthenticated, navigate])

  return {
    state: {
      mode,
      frame,
      isAuthenticated,
      isAdmin
    },
    actions
  }
}
