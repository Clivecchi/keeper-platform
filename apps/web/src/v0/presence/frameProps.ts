/**
 * frameProps
 * ==========
 * Unified frame instance props — fetch, normalize, persist via domain board-data API.
 */

import { apiFetch } from "../../lib/api"
import { normalizeProps } from "../../features/board-studio/types/frame-adapters"
import { BOARD_FRAMES } from "../boards/frameCatalog"

export interface PresenceFrameProp {
  id: string
  type: string
  config: Record<string, unknown>
  orderIndex?: number
  value?: unknown
}

export interface DomainBoardFrameRow {
  id: string
  name: string
  pattern?: string
  visibility?: string
  props: unknown
}

export interface DomainBoardData {
  board: {
    id: string
    name: string
    frames: DomainBoardFrameRow[]
  }
  domain?: Record<string, unknown>
}

/** Normalize any props shape to a consistent array at every boundary. */
export function normalizeFrameProps(raw: unknown): PresenceFrameProp[] {
  return normalizeProps(raw).map((p, index) => ({
    id: String(p.id ?? `prop_${index}`),
    type: String(p.type),
    config: (p.config ?? {}) as Record<string, unknown>,
    orderIndex: typeof p.orderIndex === "number" ? p.orderIndex : index,
    value: "value" in p ? (p as { value?: unknown }).value : undefined,
  }))
}

/** Map V0 frame key (e.g. "cover") to a FrameInstance row from domain board-data. */
export function resolveFrameInstanceByKey(
  frames: DomainBoardFrameRow[],
  frameKey: string,
  activeBoardForFrames: string,
): DomainBoardFrameRow | null {
  const catalog = BOARD_FRAMES[activeBoardForFrames] ?? []
  const frameInfo = catalog.find((f) => f.key === frameKey)
  if (!frameInfo) return null

  const targetName = frameInfo.name.toLowerCase()
  return (
    frames.find((f) => f.name.toLowerCase() === targetName) ??
    frames.find((f) => f.name.toLowerCase().replace(/\s+/g, "") === frameKey.toLowerCase()) ??
    null
  )
}

export async function fetchDomainBoardData(
  domainId: string,
): Promise<DomainBoardData | null> {
  try {
    const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/board-data`)
    const board = (res as { board?: DomainBoardData["board"] })?.board
    if (!board?.id) return null
    return {
      board,
      domain: (res as { domain?: Record<string, unknown> })?.domain,
    }
  } catch {
    return null
  }
}

/** Persist props for one frame via domain board-data PUT (array format). */
export async function saveFrameProps(
  domainId: string,
  frameInstanceId: string,
  props: PresenceFrameProp[],
): Promise<boolean> {
  try {
    const res = await apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/board-data`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frames: [
            {
              id: frameInstanceId,
              props: props.map((p, index) => ({
                id: p.id,
                type: p.type,
                config: p.config,
                orderIndex: p.orderIndex ?? index,
              })),
            },
          ],
        }),
      },
    )
    return Boolean((res as { success?: boolean })?.success ?? res)
  } catch {
    return false
  }
}

export function createFrameProp(
  type: string,
  config: Record<string, unknown>,
  existingCount: number,
): PresenceFrameProp {
  return {
    id: `prop_${Date.now()}`,
    type,
    config,
    orderIndex: existingCount,
  }
}
