"use client"

/**
 * Chronicle Layer 2 — entity registry (pilot: library only).
 *
 * New EntityKinds register here instead of adding branches to KeeperPresence.
 * See docs/chronicle-document-architecture.md.
 */

import type * as React from "react"
import { apiFetch } from "../../lib/api"
import type { ChronicleEntityKind } from "./chronicleConfig/types"
import { resolveChroniclePatchEndpoint } from "./chronicleConfig/chroniclePatch"
import { LibraryItemFocusPresence } from "./cover/LibraryItemFocusPresence"
import { libraryItemCoverSchema } from "./cover/schemas/libraryItemCoverSchema"
import type { EntityCoverSchema } from "./cover/coverTypes"
import { LibraryItemConfigPresence } from "./integrationChronicle/LibraryItemConfigPresence"
import { resolveLibraryChronicleBlocks } from "./integrationChronicle/resolveChronicleDeclaration"
import {
  libraryItemChronicleTitle,
  type LibraryNavRow,
} from "./integrationChronicle/libraryNavUtils"

/** Props passed from ChronicleEntityView to registry focus components. */
export interface ChronicleEntityFocusProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

export interface ChronicleEntitySpec {
  /** Focus mode orchestrator (Cover ↔ Config). */
  focus: React.ComponentType<ChronicleEntityFocusProps>
  /** Config mode component — may be orchestrated inside focus for some kinds. */
  config?: React.ComponentType<ChronicleEntityFocusProps>
  fetchRecord: (entityId: string) => Promise<Record<string, unknown> | null>
  resolveBlocks?: (dbBlocks: string[] | null | undefined) => string[]
  coverSchema?: EntityCoverSchema<Record<string, unknown>>
  patchEndpoint: (entityId: string, domainId: string) => string
  navLabel: (row: Record<string, unknown>) => string
}

async function fetchLibraryRecord(entityId: string): Promise<Record<string, unknown> | null> {
  try {
    const row = await apiFetch(`/api/library-items/${encodeURIComponent(entityId)}`)
    return row as Record<string, unknown>
  } catch {
    return null
  }
}

export const CHRONICLE_ENTITY_REGISTRY = {
  library: {
    focus: LibraryItemFocusPresence,
    // Orchestrated inside focus today; listed for registry completeness.
    config: LibraryItemConfigPresence as unknown as React.ComponentType<ChronicleEntityFocusProps>,
    fetchRecord: fetchLibraryRecord,
    resolveBlocks: resolveLibraryChronicleBlocks,
    coverSchema: libraryItemCoverSchema as EntityCoverSchema<Record<string, unknown>>,
    patchEndpoint: (entityId, domainId) =>
      resolveChroniclePatchEndpoint("library", entityId, domainId),
    navLabel: (row) => libraryItemChronicleTitle(row as Pick<LibraryNavRow, "source_type" | "source_ref" | "display_label">),
  },
} as const satisfies Partial<Record<ChronicleEntityKind, ChronicleEntitySpec>>

export type RegistryEntityKind = keyof typeof CHRONICLE_ENTITY_REGISTRY

export function isRegistryEntityKind(kind: string): kind is RegistryEntityKind {
  return kind in CHRONICLE_ENTITY_REGISTRY
}

export function getChronicleEntitySpec(kind: RegistryEntityKind): ChronicleEntitySpec {
  return CHRONICLE_ENTITY_REGISTRY[kind]
}
