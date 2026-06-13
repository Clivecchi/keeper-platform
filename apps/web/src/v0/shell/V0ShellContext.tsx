"use client"

import * as React from "react"
import type { StyleId } from "../styles/styles"
import type { PlacementActions, PlacementMode } from "./usePlacementMode"
import type { AudienceRole, DomainFrameJson } from "../data/domain-frame.types"

import type { WorkspaceBoardId } from "../boards/workspaceBoardNav"

export type V0FrameKey =
  | "cover"
  | "commons"
  | "index"
  | "moment"
  | "moments"
  | "present"
  | "diagnostics"
  | "feed"
  | "keepers"
  | "journeys"
  | "profile"
  | "agent"
  | "kip"
  | "admin"
  | "theme"
  | "hub"

export interface BuildFrameUrlOptions {
  draftId?: string | null
  themeSlug?: string | null
  styleId?: StyleId | null
  frame?: V0FrameKey
  preserveTheme?: boolean
}

export interface DomainDataTheme {
  coverImage?: string | null
  /** "tile" = repeat at natural size (for textures); "cover" = scale to fill (default) */
  coverImageMode?: "cover" | "tile"
}

export interface V0ShellContextValue {
  domainSlug: string
  frame: V0FrameKey
  placementMode: PlacementMode
  placementActions: PlacementActions
  themeSlug: string | null
  styleId: StyleId
  draftId: string | null
  /** Domain data including theme.coverImage for cover background on all frames */
  domainData?: { theme?: DomainDataTheme } | null
  /** Domain frame JSON — the single object every Frame renders from */
  domainFrame: DomainFrameJson | null
  /** Resolved audience role — set once at Frame level, flows to all children and Kip */
  resolvedAudience: AudienceRole | null
  buildFrameUrl: (frame: V0FrameKey, options?: BuildFrameUrlOptions) => string
  navigateToFrame: (frame: V0FrameKey, options?: BuildFrameUrlOptions) => void
  closeToBoard: () => void
  /** Re-fetch the domain frame JSON from the API and refresh all state derived from it */
  reloadDomainFrame: () => Promise<void>
  /** Active workspace from ?board= (null when not on a board surface). */
  workspaceBoardId: WorkspaceBoardId | null
  /** Design workspace: selected board definition spec from ?definition= */
  boardDefinitionId: string | null
  /** Top bar — switch workspace; clears ?definition= */
  switchWorkspace: (boardId: WorkspaceBoardId) => void
  /** Design nav — select a board definition spec (sets ?definition= only). */
  selectBoardDefinition: (definitionId: string) => void
  /** Design trail / clear — remove ?definition= */
  clearBoardDefinition: () => void
}

const V0ShellContext = React.createContext<V0ShellContextValue | null>(null)

export function V0ShellProvider({
  value,
  children
}: {
  value: V0ShellContextValue
  children: React.ReactNode
}) {
  return <V0ShellContext.Provider value={value}>{children}</V0ShellContext.Provider>
}

export function useV0Shell() {
  const context = React.useContext(V0ShellContext)
  if (!context) {
    throw new Error("useV0Shell must be used within V0ShellProvider")
  }
  return context
}

export function useV0ShellOptional() {
  return React.useContext(V0ShellContext)
}
