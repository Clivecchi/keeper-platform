"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import {
  beginIntegrationOAuthPopup,
  openIntegrationConnect,
  openIntegrationOAuthTab,
} from "../../../lib/nangoConnect"

export type IntegrationStatus = "connected" | "disconnected" | "error"

export type IntegrationType = "Services" | "Custom" | "AI_Model"

export interface IntegrationDto {
  id: string
  service: string
  integration_type: IntegrationType
  nangoConnectionId: string | null
  status: IntegrationStatus
  tier: string
  connectedAt: string | null
  metadata?: Record<string, unknown> | null
}

const PLATFORM_SERVICE_INTEGRATION_TYPE: Record<string, IntegrationType> = {
  railway: "Custom",
  vercel: "Custom",
  github: "Services",
  openai: "AI_Model",
  anthropic: "AI_Model",
  "together-ai": "AI_Model",
  elevenlabs: "AI_Model",
}

export function resolveServiceIntegrationType(serviceSlug: string): IntegrationType {
  return PLATFORM_SERVICE_INTEGRATION_TYPE[serviceSlug] ?? "Services"
}

export function serviceLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

/** Maps POST /api/integrations/session error JSON into Chronicle copy (message + hint). */
export function formatIntegrationConnectError(err: unknown): string {
  const apiErr = err as Error & {
    data?: { message?: string; hint?: string; nangoIntegrationId?: string }
  }
  const lines: string[] = []
  const msg = apiErr.data?.message ?? apiErr.message
  if (typeof msg === "string" && msg.length > 0 && !/^HTTP \d{3}/.test(msg)) {
    lines.push(msg)
  }
  if (typeof apiErr.data?.hint === "string" && apiErr.data.hint.length > 0) {
    lines.push(apiErr.data.hint)
  }
  const nangoId = apiErr.data?.nangoIntegrationId
  if (typeof nangoId === "string" && nangoId.length > 0) {
    lines.push(`Nango integration id: ${nangoId}`)
  }
  return lines.length > 0 ? lines.join("\n\n") : "Connect failed"
}

export function infraQuery(agentSlug: string, boardId?: string): string {
  const params = new URLSearchParams({ agentSlug })
  if (boardId) params.set("boardId", boardId)
  return params.toString()
}

export function formatRelativeTime(value: string | number | undefined): string {
  if (value == null) return "—"
  const d = typeof value === "number" ? new Date(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function formatConnectedAt(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  railway: "Monitor deployments, logs, and service health from the IDE Board.",
  vercel: "Track preview and production deployments, build logs, and project status.",
  github: "View commits, pull requests, and branches from your connected repository.",
}

const OAUTH_POLL_INTERVAL_MS = 3_000
const OAUTH_TIMEOUT_MS = 3 * 60 * 1_000

function findIntegrationInList(
  list: IntegrationDto[],
  serviceSlug: string,
): IntegrationDto | null {
  return (
    list.find((row) => row.service === serviceSlug && row.tier === "platform") ??
    list.find((row) => row.service === serviceSlug) ??
    null
  )
}

export function useIntegrationConnection(serviceSlug: string, domainId: string) {
  const [integration, setIntegration] = React.useState<IntegrationDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [authConnectUrl, setAuthConnectUrl] = React.useState<string | null>(null)
  const connectAttemptRef = React.useRef(0)
  const oauthPopupRef = React.useRef<Window | null>(null)

  const fetchIntegration = React.useCallback(async (): Promise<IntegrationDto | null> => {
    const list = (await apiFetch(
      `/api/integrations?domainId=${encodeURIComponent(domainId)}`,
    )) as IntegrationDto[]
    return findIntegrationInList(list, serviceSlug)
  }, [domainId, serviceSlug])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setIntegration(await fetchIntegration())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration status")
      setIntegration(null)
    } finally {
      setLoading(false)
    }
  }, [fetchIntegration])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const integrationType =
    integration?.integration_type ?? resolveServiceIntegrationType(serviceSlug)

  const completeOAuthConnect = React.useCallback(() => {
    connectAttemptRef.current += 1
    try {
      oauthPopupRef.current?.close()
    } catch {
      // ignore
    }
    oauthPopupRef.current = null
    setBusy(false)
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!busy || integrationType !== "Services") return

    let cancelled = false
    const attemptId = connectAttemptRef.current
    const label = serviceLabel(serviceSlug)
    const timeoutMessage = `${label} authorization timed out. Please try again.`

    const poll = async () => {
      if (cancelled || connectAttemptRef.current !== attemptId) return
      try {
        const match = await fetchIntegration()
        if (cancelled || connectAttemptRef.current !== attemptId) return
        if (match?.status === "connected") {
          setIntegration(match)
          completeOAuthConnect()
        }
      } catch {
        // polling errors are non-fatal — next tick retries
      }
    }

    void poll()
    const pollInterval = window.setInterval(() => void poll(), OAUTH_POLL_INTERVAL_MS)
    const timeout = window.setTimeout(() => {
      if (cancelled || connectAttemptRef.current !== attemptId) return
      setError(timeoutMessage)
      completeOAuthConnect()
    }, OAUTH_TIMEOUT_MS)

    return () => {
      cancelled = true
      window.clearInterval(pollInterval)
      window.clearTimeout(timeout)
    }
  }, [busy, completeOAuthConnect, fetchIntegration, integrationType, serviceSlug])

  const connect = React.useCallback(() => {
    let oauthPopup: Window | null = null
    const label = serviceLabel(serviceSlug)
    const connectIntegrationType =
      integration?.integration_type ?? resolveServiceIntegrationType(serviceSlug)
    if (connectIntegrationType === "Services") {
      try {
        oauthPopup = beginIntegrationOAuthPopup(label)
        oauthPopupRef.current = oauthPopup
      } catch (err) {
        setError(formatIntegrationConnectError(err))
        return
      }
    }

    const attemptId = connectAttemptRef.current + 1
    connectAttemptRef.current = attemptId
    setBusy(true)
    setError(null)
    setAuthConnectUrl(null)
    void (async () => {
      try {
        await openIntegrationConnect({
          service: serviceSlug,
          domainId,
          oauthPopup,
          onSessionReady: (url) => {
            if (connectAttemptRef.current !== attemptId) return
            setAuthConnectUrl(url)
          },
          onConnected: () => {
            if (connectAttemptRef.current !== attemptId) return
            setAuthConnectUrl(null)
            completeOAuthConnect()
          },
        })
      } catch (err) {
        if (connectAttemptRef.current !== attemptId) return
        setError(formatIntegrationConnectError(err))
      } finally {
        if (connectAttemptRef.current !== attemptId) return
        oauthPopupRef.current = null
        setAuthConnectUrl(null)
        setBusy(false)
      }
    })()
  }, [completeOAuthConnect, domainId, integration?.integration_type, serviceSlug])

  const disconnect = React.useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await apiFetch("/api/integrations/disconnect", {
        method: "POST",
        body: JSON.stringify({ service: serviceSlug, domainId }),
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed")
    } finally {
      setBusy(false)
    }
  }, [domainId, refresh, serviceSlug])

  return {
    integration,
    integrationType,
    status: integration?.status ?? "disconnected",
    loading,
    busy,
    error,
    authConnectUrl,
    setError,
    refresh,
    connect,
    disconnect,
  }
}

export function useResolvedCapabilities(agentSlug: string, boardId: string) {
  const [capabilities, setCapabilities] = React.useState<string[]>([])

  React.useEffect(() => {
    let cancelled = false
    void apiFetch(`/api/capabilities/resolve?${infraQuery(agentSlug, boardId)}`)
      .then((res: { data?: { capabilities?: string[] } }) => {
        if (!cancelled) {
          setCapabilities(Array.isArray(res.data?.capabilities) ? res.data!.capabilities! : [])
        }
      })
      .catch(() => {
        if (!cancelled) setCapabilities([])
      })
    return () => {
      cancelled = true
    }
  }, [agentSlug, boardId])

  return capabilities.filter((c) => c.startsWith("infra."))
}

export function FeedShimmer({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-md animate-pulse"
          style={{
            background: "hsl(var(--theme-surface-elevated) / 0.45)",
            width: i === 0 ? "100%" : i === 1 ? "92%" : "85%",
          }}
        />
      ))}
    </div>
  )
}

export function CapabilityChips({ capabilities }: { capabilities: string[] }) {
  if (capabilities.length === 0) return null
  return (
    <div className="mt-2 pt-3 border-t border-[hsl(var(--theme-line-hairline))]">
      <p
        className="text-[10px] uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Active capabilities
      </p>
      <div className="flex flex-wrap gap-1.5">
        {capabilities.map((cap) => (
          <span
            key={cap}
            className="rounded-full border px-2 py-0.5 text-[10px]"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
              color: "hsl(var(--theme-ink-secondary))",
            }}
          >
            {cap}
          </span>
        ))}
      </div>
    </div>
  )
}

export function IntegrationUnconnectedState({
  serviceSlug,
  displayLabel,
  integrationType,
  busy,
  error,
  authConnectUrl = null,
  oauthTroubleshootingCopy,
  connectCopy,
  onConnect,
}: {
  serviceSlug: string
  displayLabel?: string
  integrationType: IntegrationType
  busy: boolean
  error: string | null
  authConnectUrl?: string | null
  oauthTroubleshootingCopy?: React.ReactNode
  connectCopy?: string
  onConnect: () => void
}) {
  const label = displayLabel ?? serviceLabel(serviceSlug)
  const isOAuthService = integrationType === "Services"
  const description =
    connectCopy ??
    SERVICE_DESCRIPTIONS[serviceSlug] ??
    `Connect ${label} to enable platform integration.`
  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <HeroZone title={label} subtitle="Not connected" glow="muted" />
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        {description}
      </p>
      {isOAuthService && (
        <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Connect opens a separate browser window (or tab) for {label} authorization — not your GitHub profile.
          Complete Install/Authorize there, then return to Keeper.
        </p>
      )}
      <ActionButton
        label={busy ? `Authorizing ${label}…` : `Connect ${label}`}
        onClick={onConnect}
        disabled={busy}
      />
      {busy && isOAuthService && (
        <div
          className="rounded-md border px-3 py-2.5 text-[12px] leading-relaxed"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            background: "hsl(var(--theme-surface-elevated) / 0.35)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          <p className="font-medium mb-1" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Waiting for {label}
          </p>
          <p>
            Look for a window titled &quot;Connect {label} — Keeper&quot;. Complete Install/Authorize
            there, then return to Keeper.
          </p>
          {oauthTroubleshootingCopy}
          {authConnectUrl && (
            <p className="mt-2">
              <button
                type="button"
                className="underline text-left"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
                onClick={() => openIntegrationOAuthTab(authConnectUrl)}
              >
                Open {label} authorization
              </button>
            </p>
          )}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap"
          style={{
            borderColor: "hsl(0 70% 50% / 0.45)",
            background: "hsl(0 70% 50% / 0.08)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "hsl(0 65% 45%)" }}>
            Connect failed
          </p>
          {error}
        </div>
      )}
    </div>
  )
}

export function HeroZone({
  title,
  subtitle,
  glow = "muted",
}: {
  title: string
  subtitle: string
  glow?: "healthy" | "building" | "degraded" | "muted"
}) {
  const glowColor =
    glow === "healthy"
      ? "hsl(var(--theme-status-success) / 0.45)"
      : glow === "building"
        ? "hsl(var(--theme-status-warning) / 0.45)"
        : glow === "degraded"
          ? "hsl(var(--theme-status-error) / 0.45)"
          : "hsl(var(--theme-ink-tertiary) / 0.25)"

  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.4)",
        boxShadow: `0 0 20px 2px ${glowColor}`,
      }}
    >
      <h3 className="text-[15px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {title}
      </h3>
      <p className="mt-0.5 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        {subtitle}
      </p>
    </div>
  )
}

export function StatusStrip({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] leading-relaxed"
      style={{ color: "hsl(var(--theme-ink-secondary))" }}
    >
      {children}
    </p>
  )
}

export function ActionButton({
  label,
  onClick,
  disabled,
  variant = "default",
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "danger"
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="rounded-md border px-3 py-1.5 text-[12px] transition-opacity disabled:opacity-50"
      style={{
        borderColor:
          variant === "danger"
            ? "hsl(var(--theme-status-error) / 0.4)"
            : "hsl(var(--theme-border-soft))",
        color:
          variant === "danger"
            ? "hsl(var(--theme-status-error))"
            : "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label}
    </button>
  )
}

export function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
        {message}
      </p>
      <ActionButton label="Retry" onClick={onRetry} />
    </div>
  )
}

export async function confirmDestructiveAction(message: string): Promise<boolean> {
  if (typeof window === "undefined") return false
  return window.confirm(message)
}
