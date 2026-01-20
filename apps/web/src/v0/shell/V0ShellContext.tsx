"use client"

import * as React from "react"
import type { StyleId } from "../styles/styles"

export type V0FrameKey =
  | "cover"
  | "index"
  | "moment"
  | "moments"
  | "diagnostics"
  | "feed"
  | "keepers"
  | "journeys"
  | "profile"
  | "agent"
  | "admin"

export interface BuildFrameUrlOptions {
  draftId?: string | null
  themeSlug?: string | null
  styleId?: StyleId | null
  frame?: V0FrameKey
  preserveTheme?: boolean
}

export interface V0ShellContextValue {
  domainSlug: string
  frame: V0FrameKey
  themeSlug: string | null
  styleId: StyleId
  draftId: string | null
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
