/**
 * Phase 2.1 — Guided Arrival detection helpers.
 * Pending when explicitly seeded false; legacy unset domains are not pending.
 */

export interface GuidedArrivalFrameJson {
  arrival?: {
    completed?: boolean
  }
}

export function isGuidedArrivalPending(
  settings?: Record<string, unknown> | null,
  frameJson?: GuidedArrivalFrameJson | Record<string, unknown> | null,
): boolean {
  if (settings?.arrivalCompleted === true) return false

  const arrival =
    frameJson &&
    typeof frameJson === 'object' &&
    !Array.isArray(frameJson) &&
    frameJson.arrival &&
    typeof frameJson.arrival === 'object' &&
    !Array.isArray(frameJson.arrival)
      ? (frameJson.arrival as { completed?: boolean })
      : null

  if (arrival?.completed === true) return false
  if (settings?.arrivalCompleted === false) return true
  if (arrival?.completed === false) return true

  return false
}

export const GUIDED_ARRIVAL_COMPOSE_HINT =
  'Tell me what you would like to keep in this domain…'
