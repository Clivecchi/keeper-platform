"use client"

/**
 * KipChatDrawer - Chat panel opened by the Kip button.
 * Contains: chat (AgentComposer when available), Debug button, Version v0.1.
 */

import * as React from "react"
import { XMarkIcon, BugAntIcon } from "@heroicons/react/24/outline"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useAgentComposerContext } from "../shell/AgentComposerContext"
import { AgentComposer } from "../../components/agent/AgentComposer"
import { apiFetch } from "../../lib/api"
import { getBlobProxyUrl } from "../../lib/blobProxy"

const KIP_CHAT_VERSION = "v0.1"

export type KipChatDrawerContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const KipChatDrawerContext = React.createContext<KipChatDrawerContextValue | null>(null)

export function useKipChatDrawer() {
  return React.useContext(KipChatDrawerContext)
}

export function KipChatDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const value = React.useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((o) => !o),
    }),
    [isOpen]
  )
  return (
    <KipChatDrawerContext.Provider value={value}>
      {children}
    </KipChatDrawerContext.Provider>
  )
}

async function runDebugDiagnostics(): Promise<string> {
  const lines: string[] = []
  const ts = () => new Date().toISOString()

  lines.push(`=== Kip Debug Log ${ts()} ===`)
  lines.push("")

  // Navigation / redirect chain
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      lines.push("--- Navigation ---")
      lines.push(`  type: ${nav.type}`)
      lines.push(`  redirectCount: ${nav.redirectCount}`)
      lines.push(`  loadEventEnd: ${nav.loadEventEnd?.toFixed(0)}ms`)
    }
  } catch (e) {
    lines.push(`Navigation error: ${e}`)
  }

  // Current URL
  lines.push("")
  lines.push("--- Current URL ---")
  lines.push(`  href: ${window.location.href}`)
  lines.push(`  pathname: ${window.location.pathname}`)
  lines.push(`  search: ${window.location.search}`)

  // Auth
  try {
    const keeper = (window as any).__keeper
    if (keeper?.checkAuth) {
      const auth = keeper.checkAuth()
      lines.push("")
      lines.push("--- Auth ---")
      lines.push(`  hasToken: ${auth.hasToken}`)
      lines.push(`  tokenLocation: ${auth.tokenLocation}`)
    }
  } catch (e) {
    lines.push(`Auth check error: ${e}`)
  }

  // Domain / cover image
  try {
    const slug = window.location.pathname.match(/\/d\/([^/]+)/)?.[1] || "default"
    const res = await apiFetch(`/api/domains/by-slug/${slug}`) as { id?: string; theme?: { coverImage?: string } }
    const coverUrl = res?.theme?.coverImage ?? null
    const displayUrl = coverUrl ? getBlobProxyUrl(coverUrl) : null

    lines.push("")
    lines.push("--- Domain / Cover Image ---")
    lines.push(`  domainId: ${res?.id ?? "n/a"}`)
    lines.push(`  theme.coverImage (raw): ${coverUrl ?? "null"}`)
    lines.push(`  getBlobProxyUrl result: ${displayUrl ?? "null"}`)

    if (coverUrl) {
      try {
        const testUrl = (displayUrl?.startsWith("/") ? window.location.origin + displayUrl : displayUrl) || coverUrl
        const imgTest = await fetch(testUrl, { method: "HEAD" })
        lines.push(`  image fetch status: ${imgTest.status}`)
      } catch (e) {
        lines.push(`  image fetch error: ${e}`)
      }
    }
  } catch (e) {
    lines.push(`Domain/cover error: ${e}`)
  }

  // API base
  lines.push("")
  lines.push("--- Config ---")
  lines.push(`  VITE_API_URL: ${(import.meta as any)?.env?.VITE_API_URL ?? "undefined"}`)

  lines.push("")
  lines.push("=== End Debug Log ===")
  return lines.join("\n")
}

export function KipChatDrawer() {
  const ctx = useKipChatDrawer()
  const v0Shell = useV0ShellOptional()
  const composerProps = useAgentComposerContext()
  const [debugLog, setDebugLog] = React.useState<string | null>(null)
  const [isRunningDebug, setIsRunningDebug] = React.useState(false)

  if (!ctx?.isOpen) return null

  const isAgentFrame = v0Shell?.frame === "agent" || v0Shell?.frame === "kip"

  const handleDebug = async () => {
    setIsRunningDebug(true)
    setDebugLog(null)
    try {
      const log = await runDebugDiagnostics()
      setDebugLog(log)
      console.log("[Kip Debug]", log)
    } catch (e) {
      setDebugLog(`Error: ${e}`)
    } finally {
      setIsRunningDebug(false)
    }
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t shadow-2xl"
      style={{
        maxHeight: "70vh",
        backgroundColor: "hsl(var(--theme-surface-page) / 0.98)",
        borderColor: "var(--theme-border-soft)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2 border-b"
        style={{ borderColor: "var(--theme-border-soft)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--theme-ink-primary)" }}>
            Kip Chat
          </span>
          <span className="text-[10px] opacity-60" style={{ color: "var(--theme-ink-tertiary)" }}>
            Version {KIP_CHAT_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDebug}
            disabled={isRunningDebug}
            className="flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-90 disabled:opacity-50"
            style={{
              borderColor: "var(--theme-border-soft)",
              color: "var(--theme-ink-secondary)",
            }}
            title="Run debug diagnostics"
          >
            <BugAntIcon className="h-3.5 w-3.5" />
            {isRunningDebug ? "Running…" : "Debug"}
          </button>
          <button
            type="button"
            onClick={ctx.close}
            className="rounded p-1 transition-colors hover:opacity-80"
            style={{ color: "var(--theme-ink-tertiary)" }}
            aria-label="Close chat"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {debugLog ? (
          <pre
            className="whitespace-pre-wrap break-words text-[10px] font-mono"
            style={{ color: "var(--theme-ink-secondary)" }}
          >
            {debugLog}
          </pre>
        ) : composerProps && isAgentFrame ? (
          <div className="max-w-2xl">
            <AgentComposer {...composerProps} />
          </div>
        ) : (
          <div className="space-y-3 text-sm" style={{ color: "var(--theme-ink-secondary)" }}>
            <p>Open Kip to chat with the domain agent.</p>
            <p className="text-xs">
              Click the Kip button below to open the full agent view, or use the Debug button above to collect diagnostics (double load, cover image, etc.).
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
