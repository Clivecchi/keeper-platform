"use client"

import * as React from "react"
import { isGuidedArrivalPending } from "@keeper/shared"
import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"
import { useAuth } from "../../context/AuthContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"

export interface GuidedArrivalContextValue {
  /** Owner first visit — arrival UI should activate. */
  isActive: boolean
  /** Soft-dismissed banner; dialog/cover arrival may still show until acknowledged. */
  isBannerDismissed: boolean
  greeting: string
  leadAgentSlug: string
  leadAgentDisplayName: string
  coverGreeting: string
  dismissBanner: () => void
  acknowledge: () => Promise<void>
}

const GuidedArrivalCtx = React.createContext<GuidedArrivalContextValue | null>(null)

const noopAsync = async () => {}

const INACTIVE: GuidedArrivalContextValue = {
  isActive: false,
  isBannerDismissed: false,
  greeting: "",
  leadAgentSlug: "kip",
  leadAgentDisplayName: "Kip",
  coverGreeting: "",
  dismissBanner: () => {},
  acknowledge: noopAsync,
}

function resolveDomainId(domainData: unknown): string | null {
  const id = (domainData as { id?: string } | null | undefined)?.id
  if (!id || String(id).startsWith("fallback-")) return null
  return String(id)
}

export function GuidedArrivalProvider({ children }: { children: React.ReactNode }) {
  const shell = useV0ShellOptional()
  const { user, isAuthenticated } = useAuth()
  const [settings, setSettings] = React.useState<Record<string, unknown> | null>(null)
  const [settingsLoaded, setSettingsLoaded] = React.useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false)
  const [completedLocally, setCompletedLocally] = React.useState(false)
  const [leadAgentDisplayName, setLeadAgentDisplayName] = React.useState("Kip")

  const workspaceBoardId = shell?.workspaceBoardId ?? null
  const domainData = shell?.domainData
  const domainFrame = shell?.domainFrame
  const domainId = resolveDomainId(domainData)
  const ownerId = (domainData as { ownerId?: string } | null | undefined)?.ownerId
  const isOwner =
    isAuthenticated &&
    !!user?.id &&
    !!ownerId &&
    String(ownerId) === String(user.id)

  const leadAgentSlug = domainFrame?.kip?.agent_id?.trim() || "kip"
  const greeting = domainFrame?.kip?.greeting?.trim() || ""
  const coverGreeting = greeting || domainFrame?.theme?.tagline?.trim() || ""

  React.useEffect(() => {
    if (workspaceBoardId !== "domain" || !isOwner || !domainId) {
      setSettings(null)
      setSettingsLoaded(false)
      return
    }

    let cancelled = false
    setSettingsLoaded(false)
    void apiFetch(`/api/domains/${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const domain = (res as { domain?: { settings?: Record<string, unknown> } })?.domain
        setSettings(
          domain?.settings && typeof domain.settings === "object" && !Array.isArray(domain.settings)
            ? domain.settings
            : {},
        )
      })
      .catch(() => {
        if (!cancelled) setSettings(null)
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [workspaceBoardId, isOwner, domainId])

  React.useEffect(() => {
    if (!leadAgentSlug || leadAgentSlug === "kip") {
      setLeadAgentDisplayName("Kip")
      return
    }
    let cancelled = false
    void KipApi.getAgentBySlug(leadAgentSlug)
      .then((agent) => {
        if (!cancelled) setLeadAgentDisplayName(agent.name?.trim() || leadAgentSlug)
      })
      .catch(() => {
        if (!cancelled) setLeadAgentDisplayName(leadAgentSlug)
      })
    return () => {
      cancelled = true
    }
  }, [leadAgentSlug])

  const pending =
    !completedLocally &&
    settingsLoaded &&
    isOwner &&
    workspaceBoardId === "domain" &&
    isGuidedArrivalPending(settings, domainFrame as Record<string, unknown> | null)

  const acknowledge = React.useCallback(async () => {
    if (!domainId || completedLocally) return
    setCompletedLocally(true)
    setIsBannerDismissed(true)
    try {
      await apiFetch(`/api/domains/${encodeURIComponent(domainId)}`, {
        method: "PATCH",
        body: JSON.stringify({ settings: { arrivalCompleted: true } }),
      })
      setSettings((prev) => ({ ...(prev ?? {}), arrivalCompleted: true }))
    } catch (err) {
      console.warn("[GuidedArrival] Failed to mark arrival complete:", err)
      setCompletedLocally(false)
    }
  }, [domainId, completedLocally])

  const dismissBanner = React.useCallback(() => {
    setIsBannerDismissed(true)
  }, [])

  const value = React.useMemo<GuidedArrivalContextValue>(() => {
    if (!pending) return INACTIVE
    return {
      isActive: true,
      isBannerDismissed,
      greeting,
      leadAgentSlug,
      leadAgentDisplayName,
      coverGreeting,
      dismissBanner,
      acknowledge,
    }
  }, [
    pending,
    isBannerDismissed,
    greeting,
    leadAgentSlug,
    leadAgentDisplayName,
    coverGreeting,
    dismissBanner,
    acknowledge,
  ])

  return (
    <GuidedArrivalCtx.Provider value={value}>
      {children}
    </GuidedArrivalCtx.Provider>
  )
}

export function useGuidedArrival(): GuidedArrivalContextValue {
  return React.useContext(GuidedArrivalCtx) ?? INACTIVE
}

export function useGuidedArrivalOptional(): GuidedArrivalContextValue | null {
  const ctx = React.useContext(GuidedArrivalCtx)
  if (!ctx?.isActive) return null
  return ctx
}
