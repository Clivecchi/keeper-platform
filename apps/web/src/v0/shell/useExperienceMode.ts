import { useMemo } from "react"
import type { NavigateFunction } from "react-router-dom"
import type { V0FrameKey } from "./V0ShellContext"

export type ExperienceMode = "publicStory" | "commons" | "kipFocus" | "admin"

export type ExperienceState = {
  mode: ExperienceMode
  frame: V0FrameKey
  isAuthenticated: boolean
  isAdmin: boolean
}

export type ExperienceActions = {
  openKip: () => void
  closeKip: () => void
  goCommons: () => void
  goAdmin: () => void
  goCover: () => void
  goIndex: () => void
}

type ExperienceModeParams = {
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

function resolveFrame(requestedFrame: V0FrameKey, isAuthenticated: boolean): V0FrameKey {
  if (!isAuthenticated && PRIVATE_FRAMES.has(requestedFrame)) {
    return "cover"
  }
  return requestedFrame
}

function deriveMode(pathname: string, frame: V0FrameKey, isAuthenticated: boolean): ExperienceMode {
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

export function useExperienceMode({
  domainSlug,
  pathname,
  isAuthenticated,
  isAdmin,
  requestedFrame,
  buildFrameUrl,
  navigate
}: ExperienceModeParams): { state: ExperienceState; actions: ExperienceActions } {
  const frame = useMemo(() => resolveFrame(requestedFrame, isAuthenticated), [requestedFrame, isAuthenticated])
  const mode = useMemo(() => deriveMode(pathname, frame, isAuthenticated), [pathname, frame, isAuthenticated])

  const actions = useMemo<ExperienceActions>(() => {
    return {
      openKip: () => navigate(buildFrameUrl("agent")),
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
