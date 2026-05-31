"use client"

/**
 * IntegrationPresence — Chronicle surface for IDE Board integration nav items.
 * Uses Nango Connect UI; credentials stay in Nango.
 */
import * as React from "react"
import { apiFetch } from "../../lib/apiFetch"
import { openIntegrationConnect } from "../../lib/nangoConnect"

export type IntegrationStatus = "connected" | "disconnected" | "error"

export interface IntegrationDto {
  id: string
  service: string
  nangoConnectionId: string | null
  status: IntegrationStatus
  tier: string
  connectedAt: string | null
}

export interface IntegrationPresenceProps {
  serviceSlug: string
  domainId: string
}

const DEFERRED_SERVICES = new Set(["github"])

function formatConnectedAt(iso: string | null): string {
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

function serviceLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export function IntegrationPresence({ serviceSlug, domainId }: IntegrationPresenceProps) {
  const [integration, setIntegration] = React.useState<IntegrationDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = (await apiFetch(
        `/api/integrations?domainId=${encodeURIComponent(domainId)}`,
      )) as IntegrationDto[]
      const match =
        list.find((row) => row.service === serviceSlug && row.tier === "platform") ??
        list.find((row) => row.service === serviceSlug) ??
        null
      setIntegration(match)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration status")
      setIntegration(null)
    } finally {
      setLoading(false)
    }
  }, [domainId, serviceSlug])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const status: IntegrationStatus = integration?.status ?? "disconnected"
  const label = serviceLabel(serviceSlug)

  const handleConnect = React.useCallback(async () => {
    if (DEFERRED_SERVICES.has(serviceSlug)) {
      // incomplete — GitHub platform connection deferred until Railway/Vercel are proven
      return
    }
    setBusy(true)
    setError(null)
    try {
      await openIntegrationConnect({
        service: serviceSlug,
        domainId,
        onConnected: () => {
          void refresh()
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed")
    } finally {
      setBusy(false)
    }
  }, [domainId, refresh, serviceSlug])

  const handleDisconnect = React.useCallback(async () => {
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

  if (loading) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading {label}…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div>
        <h3
          className="text-[14px] font-medium"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Platform integration via Nango
        </p>
      </div>

      <div
        className="rounded-md border px-3 py-2 text-[12px]"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.45)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
      >
        <div className="flex justify-between gap-2 py-1">
          <span>Status</span>
          <span
            style={{
              color:
                status === "connected"
                  ? "rgb(16 185 129)"
                  : status === "error"
                    ? "hsl(var(--theme-accent-warning, var(--theme-ink-primary)))"
                    : "hsl(var(--theme-ink-tertiary))",
              fontWeight: status === "connected" ? 500 : 400,
            }}
          >
            {status === "connected"
              ? "Connected"
              : status === "error"
                ? "Error"
                : "Not connected"}
          </span>
        </div>
        {integration?.connectedAt && status === "connected" && (
          <div className="flex justify-between gap-2 py-1 border-t border-[hsl(var(--theme-line-hairline))]">
            <span>Connected</span>
            <span>{formatConnectedAt(integration.connectedAt)}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-accent-warning, #b45309))" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "connected" ? (
          <ActionButton label="Disconnect" onClick={handleDisconnect} disabled={busy} />
        ) : status === "error" ? (
          <ActionButton
            label={busy ? "Reconnecting…" : "Reconnect"}
            onClick={handleConnect}
            disabled={busy || DEFERRED_SERVICES.has(serviceSlug)}
          />
        ) : (
          <ActionButton
            label={busy ? "Opening…" : `Connect ${label}`}
            onClick={handleConnect}
            disabled={busy || DEFERRED_SERVICES.has(serviceSlug)}
          />
        )}
      </div>

      {DEFERRED_SERVICES.has(serviceSlug) && (
        <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {/* incomplete — GitHub specifically: deferred until platform Railway/Vercel connections are proven */}
          GitHub connection is not enabled in this step.
        </p>
      )}

      {/* incomplete — user-level self-serve connections: Chronicle UI for per-user OAuth is a later step */}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="rounded-md border px-3 py-1.5 text-[12px] transition-opacity disabled:opacity-50"
      style={{
        borderColor: "hsl(var(--theme-border-soft))",
        color: "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label}
    </button>
  )
}
