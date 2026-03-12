"use client"

import * as React from "react"
import type { StyleId } from "../styles/styles"
import type { ExperienceActions, ExperienceMode } from "./useExperienceMode"
import type { AudienceRole, DomainFrameJson } from "../data/domain-frame.types"

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
  experienceMode: ExperienceMode
  experienceActions: ExperienceActions
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
