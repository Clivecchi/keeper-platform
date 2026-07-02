import type { V0FrameKey } from "./V0ShellContext"

/** Frames guests may view on the public story surface (no board chrome). */
export const GUEST_PUBLIC_FRAMES = new Set<V0FrameKey>([
  "cover",
  "present",
  "moment",
  "moments",
  "diagnostics",
  "index",
  "journeys",
  "keepers",
  "feed",
])

export function resolveGuestPublicFrame(
  frameParam: string | null,
  fallback: V0FrameKey = "cover",
): V0FrameKey {
  const normalized = (frameParam || fallback).toLowerCase() as V0FrameKey
  if (GUEST_PUBLIC_FRAMES.has(normalized)) return normalized
  return "cover"
}
