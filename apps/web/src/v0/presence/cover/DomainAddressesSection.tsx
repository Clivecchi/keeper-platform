"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"
import { apiFetch } from "../../../lib/api"
import { buildKeeperTenantHostname } from "../../../lib/platformHost"
import DnsInfoPanel from "../../../components/domain-manager/DnsInfoPanel"

const CUSTOM_DOMAIN_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/

export interface DomainAddressesSectionProps {
  domainId: string
  /** Persisted Domain.slug — the live Keeper hostname. */
  savedSlug: string
  /** Platform-unique domain tag draft (maps to slug). Saved via Configure Save bar. */
  domainTag: string
  onDomainTagChange: (value: string) => void
  domainTagError?: string
  customDomain?: string | null
  customDomainVerified?: boolean
  /** Unsaved custom-domain draft bound to Chronicle Save. */
  customDomainDraft?: string
  onCustomDomainDraftChange?: (value: string) => void
  onAddressesUpdated?: (patch: {
    customDomain?: string | null
    customDomainVerified?: boolean
  }) => void
  /** Hide stacked-section chrome when this is its own Domain Card frame. */
  embedded?: boolean
}

interface DnsStatusPayload {
  attached?: boolean
  configured?: boolean
  verified?: boolean
  hostname?: string
  configuredBy?: string | null
  records?: Array<{ type: string; domain: string; value: string }>
  currentNameServers?: string[]
  intendedNameServers?: string[]
  /** @deprecated Use currentNameServers */
  nameServers?: string[]
  error?: string
  errorCode?: string
}

const sectionLabelStyle: React.CSSProperties = {
  color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))",
}

const quietStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-secondary))",
}

const readOnlyBoxStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "var(--treatment-paper, hsl(var(--theme-surface-paper)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

const inputStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "var(--treatment-paper, hsl(var(--theme-surface-paper)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

const actionButtonStyle: React.CSSProperties = {
  border: "1px solid var(--treatment-action, hsl(var(--theme-accent-primary)))",
  background: "var(--treatment-action, hsl(var(--theme-accent-primary)))",
  color: "var(--treatment-action-ink, hsl(var(--theme-surface-paper)))",
}

export function DomainAddressesSection({
  domainId,
  savedSlug,
  domainTag,
  onDomainTagChange,
  domainTagError,
  customDomain: customDomainProp,
  customDomainVerified: customDomainVerifiedProp = false,
  customDomainDraft = "",
  onCustomDomainDraftChange,
  onAddressesUpdated,
  embedded = false,
}: DomainAddressesSectionProps) {
  const [savedCustomDomain, setSavedCustomDomain] = React.useState(
    customDomainProp?.trim() ?? "",
  )
  const [customDomainVerified, setCustomDomainVerified] = React.useState(
    customDomainVerifiedProp,
  )
  const [dnsStatus, setDnsStatus] = React.useState<DnsStatusPayload | null>(null)
  const [keeperHostStatus, setKeeperHostStatus] = React.useState<DnsStatusPayload | null>(null)
  const [loadingDns, setLoadingDns] = React.useState(false)
  const [loadingKeeperHost, setLoadingKeeperHost] = React.useState(false)
  const [addingCustomDomain, setAddingCustomDomain] = React.useState(false)
  const [addingToVercel, setAddingToVercel] = React.useState(false)
  const [hostingKeeperAddress, setHostingKeeperAddress] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const liveHostname = React.useMemo(
    () => buildKeeperTenantHostname(savedSlug),
    [savedSlug],
  )
  const draftHostname = React.useMemo(
    () => buildKeeperTenantHostname(domainTag),
    [domainTag],
  )
  const tagPending =
    domainTag.trim().toLowerCase() !== savedSlug.trim().toLowerCase() &&
    domainTag.trim().length > 0

  React.useEffect(() => {
    setSavedCustomDomain(customDomainProp?.trim() ?? "")
    setCustomDomainVerified(customDomainVerifiedProp)
    setDnsStatus(null)
    setError(null)
    setSuccess(null)
  }, [domainId, customDomainProp, customDomainVerifiedProp])

  const loadDnsStatus = React.useCallback(async () => {
    if (!savedCustomDomain) {
      setDnsStatus(null)
      return
    }
    setLoadingDns(true)
    try {
      const status = (await apiFetch(
        `/api/domains/custom/${domainId}/custom-domain/status`,
      )) as DnsStatusPayload
      setDnsStatus(status)
      if (status.verified) {
        if (!customDomainVerifiedProp) {
          try {
            await apiFetch(`/api/domains/custom/${domainId}/custom-domain/verify`, {
              method: "POST",
            })
          } catch {
            // Status may show verified before DB sync; resolve-host will retry on public traffic.
          }
        }
        setCustomDomainVerified(true)
        onAddressesUpdated?.({ customDomainVerified: true })
      }
      if (status.error) {
        setError(status.error)
      } else {
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load domain status")
    } finally {
      setLoadingDns(false)
    }
  }, [domainId, savedCustomDomain, onAddressesUpdated, customDomainVerifiedProp])

  const loadKeeperHostStatus = React.useCallback(async () => {
    if (!savedSlug.trim()) {
      setKeeperHostStatus(null)
      return
    }
    setLoadingKeeperHost(true)
    try {
      const status = (await apiFetch(
        `/api/domains/custom/${domainId}/keeper-host/status`,
      )) as DnsStatusPayload
      setKeeperHostStatus(status)
    } catch (err) {
      setKeeperHostStatus({
        hostname: liveHostname,
        attached: false,
        verified: false,
        error: err instanceof Error ? err.message : "Failed to load Keeper address status",
      })
    } finally {
      setLoadingKeeperHost(false)
    }
  }, [domainId, savedSlug, liveHostname])

  React.useEffect(() => {
    if (savedCustomDomain) {
      void loadDnsStatus()
    } else {
      setDnsStatus(null)
    }
  }, [savedCustomDomain, loadDnsStatus])

  React.useEffect(() => {
    void loadKeeperHostStatus()
  }, [loadKeeperHostStatus])

  React.useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleAddCustomDomain = async () => {
    const trimmed = customDomainDraft.trim().toLowerCase()
    if (!trimmed) {
      setError("Enter a custom domain (e.g. livecchi.us).")
      return
    }
    if (!CUSTOM_DOMAIN_PATTERN.test(trimmed)) {
      setError("Use a valid domain like livecchi.us (no paths or protocols).")
      return
    }

    setAddingCustomDomain(true)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}`, {
        method: "PATCH",
        body: JSON.stringify({ customDomain: trimmed }),
      })
      setSavedCustomDomain(trimmed)
      onCustomDomainDraftChange?.(trimmed)
      setCustomDomainVerified(false)
      onAddressesUpdated?.({ customDomain: trimmed, customDomainVerified: false })
      setSuccess("Custom domain saved")
      window.setTimeout(() => void loadDnsStatus(), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save custom domain")
    } finally {
      setAddingCustomDomain(false)
    }
  }

  const handleHostKeeperAddress = async () => {
    setHostingKeeperAddress(true)
    setError(null)
    try {
      const response = (await apiFetch(`/api/domains/custom/${domainId}/keeper-host`, {
        method: "POST",
      })) as { success?: boolean; error?: string } & DnsStatusPayload
      if (response.success === false) {
        throw new Error(response.error || "Failed to host Keeper address")
      }
      setKeeperHostStatus(response)
      setSuccess(`Hosted ${response.hostname ?? liveHostname} on Vercel`)
      await loadKeeperHostStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to host Keeper address")
    } finally {
      setHostingKeeperAddress(false)
    }
  }

  const handleAddToVercel = async () => {
    if (!savedCustomDomain) return
    setAddingToVercel(true)
    setError(null)
    try {
      const response = (await apiFetch(
        `/api/domains/custom/${domainId}/custom-domain`,
        {
          method: "POST",
          body: JSON.stringify({ customDomain: savedCustomDomain }),
        },
      )) as { success?: boolean; error?: string }
      if (response.success === false) {
        throw new Error(response.error || "Failed to add domain to Vercel")
      }
      setSuccess("Domain added to Vercel")
      await loadDnsStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain to Vercel")
    } finally {
      setAddingToVercel(false)
    }
  }

  const handleVerifyDomain = async () => {
    if (!savedCustomDomain) return
    setVerifying(true)
    setError(null)
    try {
      const response = (await apiFetch(
        `/api/domains/custom/${domainId}/custom-domain/verify`,
        { method: "POST" },
      )) as { success?: boolean; error?: string }
      if (response.success === false) {
        throw new Error(response.error || "Verification failed")
      }
      setCustomDomainVerified(true)
      onAddressesUpdated?.({ customDomainVerified: true })
      setSuccess("Domain verified")
      await loadDnsStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify domain")
    } finally {
      setVerifying(false)
    }
  }

  const handleRemoveCustomDomain = async () => {
    if (!savedCustomDomain) return
    if (
      !window.confirm(
        `Remove custom domain "${savedCustomDomain}"? Traffic will use ${liveHostname} until you add another.`,
      )
    ) {
      return
    }
    setRemoving(true)
    setError(null)
    try {
      const response = (await apiFetch(
        `/api/domains/custom/${domainId}/custom-domain`,
        { method: "DELETE" },
      )) as { success?: boolean; error?: string }
      if (response.success === false) {
        throw new Error(response.error || "Failed to remove custom domain")
      }
      setSavedCustomDomain("")
      onCustomDomainDraftChange?.("")
      setCustomDomainVerified(false)
      setDnsStatus(null)
      onAddressesUpdated?.({ customDomain: null, customDomainVerified: false })
      setSuccess("Custom domain removed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove custom domain")
    } finally {
      setRemoving(false)
    }
  }

  const vercelAttached = Boolean(dnsStatus?.attached)
  const dnsConfigured = Boolean(dnsStatus?.configured)
  const dnsVerified = Boolean(dnsStatus?.verified || customDomainVerified)
  const keeperHostAttached = Boolean(keeperHostStatus?.attached)

  return (
    <div
      className={embedded ? "mb-4" : "mt-6 mb-4 pt-5 border-t"}
      style={embedded ? undefined : { borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      {embedded ? null : (
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-3"
          style={sectionLabelStyle}
        >
          Addresses
        </p>
      )}

      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Domain tag</p>
        <input
          type="text"
          value={domainTag}
          onChange={(e) => onDomainTagChange(e.target.value)}
          placeholder="chuck-livecchi"
          className="w-full rounded-md px-3 py-2 text-sm font-mono"
          style={inputStyle}
          autoComplete="off"
          spellCheck={false}
        />
        {domainTagError ? (
          <p
            className="text-[12px] mt-1"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {domainTagError}
          </p>
        ) : null}
        <p className="text-[11px] mt-1" style={quietStyle}>
          Unique across Keeper — lowercase letters, numbers, and hyphens. Use Save to apply
          changes.
        </p>
      </div>

      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Keeper address</p>
        <div
          className="rounded-md px-3 py-2 text-sm font-mono opacity-90"
          style={readOnlyBoxStyle}
          aria-readonly
        >
          https://{liveHostname}
        </div>
        {tagPending ? (
          <p className="text-[11px] mt-1" style={quietStyle}>
            After Save this will be{" "}
            <span className="font-mono">https://{draftHostname}</span>
          </p>
        ) : null}

        <div
          className="rounded-md border px-3 py-2.5 mt-3 space-y-2"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              {keeperHostAttached ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : keeperHostStatus?.error ? (
                <ExclamationTriangleIcon
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                />
              ) : (
                <ClockIcon
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">Host on Vercel</p>
                <p className="text-[11px]" style={quietStyle}>
                  {keeperHostAttached
                    ? "Attached to the Keeper web project"
                    : keeperHostStatus?.error
                      ? keeperHostStatus.error
                      : loadingKeeperHost
                        ? "Checking hosting…"
                        : "This URL 404s until the saved tag is attached to the web project."}
                </p>
              </div>
            </div>
            {!keeperHostAttached ? (
              <button
                type="button"
                onClick={() => void handleHostKeeperAddress()}
                disabled={hostingKeeperAddress || !savedSlug.trim()}
                className="rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                style={actionButtonStyle}
              >
                {hostingKeeperAddress ? "Hosting…" : "Host on Vercel"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Custom domain</p>
        {!savedCustomDomain ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={customDomainDraft}
              onChange={(e) => onCustomDomainDraftChange?.(e.target.value)}
              placeholder="livecchi.us"
              className="flex-1 rounded-md px-3 py-2 text-sm"
              style={inputStyle}
              disabled={addingCustomDomain}
            />
            <button
              type="button"
              onClick={() => void handleAddCustomDomain()}
              disabled={addingCustomDomain || !customDomainDraft.trim()}
              className="rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-50"
              style={actionButtonStyle}
            >
              {addingCustomDomain ? "Saving…" : "Add domain"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <GlobeAltIcon className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--theme-ink-secondary))" }} />
                <span className="text-sm font-medium truncate">{savedCustomDomain}</span>
                {dnsVerified ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleRemoveCustomDomain()}
                disabled={removing}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-50"
                style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>

            <div
              className="rounded-md border px-3 py-2.5 space-y-2"
              style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  {vercelAttached ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : dnsStatus?.error ? (
                    <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }} />
                  ) : (
                    <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--theme-ink-secondary))" }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Add to Vercel</p>
                    <p className="text-[11px]" style={quietStyle}>
                      {vercelAttached
                        ? "Attached to the Keeper web project"
                        : dnsStatus?.error ?? "Register this hostname on Vercel"}
                    </p>
                  </div>
                </div>
                {!vercelAttached && !dnsStatus?.error ? (
                  <button
                    type="button"
                    onClick={() => void handleAddToVercel()}
                    disabled={addingToVercel}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                    style={actionButtonStyle}
                  >
                    {addingToVercel ? "Adding…" : "Add to Vercel"}
                  </button>
                ) : null}
                {dnsStatus?.error ? (
                  <button
                    type="button"
                    onClick={() => void loadDnsStatus()}
                    className="rounded-md px-2.5 py-1 text-xs font-semibold shrink-0"
                    style={actionButtonStyle}
                  >
                    Retry
                  </button>
                ) : null}
              </div>

              {vercelAttached ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {dnsVerified ? (
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : dnsConfigured ? (
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--theme-ink-secondary))" }} />
                    )}
                    <div>
                      <p className="text-sm font-medium">DNS &amp; verification</p>
                      <p className="text-[11px]" style={quietStyle}>
                        {dnsVerified
                          ? "Verified — Vercel issues HTTPS automatically"
                          : dnsConfigured
                            ? "DNS detected — run verify when ready"
                            : "Add DNS records at your registrar"}
                      </p>
                    </div>
                  </div>
                  {!dnsVerified ? (
                    <button
                      type="button"
                      onClick={() => void handleVerifyDomain()}
                      disabled={verifying || loadingDns}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                      style={actionButtonStyle}
                    >
                      {verifying ? "Verifying…" : "Verify"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {vercelAttached ? (
              <DnsInfoPanel
                records={dnsStatus?.records ?? []}
                customDomain={savedCustomDomain}
                currentNameServers={
                  dnsStatus?.currentNameServers ?? dnsStatus?.nameServers ?? []
                }
                intendedNameServers={dnsStatus?.intendedNameServers}
                configuredBy={dnsStatus?.configuredBy}
                configured={dnsConfigured}
                verified={dnsVerified}
                compact
              />
            ) : null}
          </div>
        )}
        <p className="text-[11px] mt-2" style={quietStyle}>
          Optional public brand URL (e.g. livecchi.us). Save to keep it, then attach it to Vercel.
          Separate from your Keeper address above.
        </p>
      </div>

      {error ? (
        <p className="text-[12px] mb-2" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-[12px] mb-2" style={{ color: "hsl(var(--theme-status-success, 142 71% 45%))" }}>
          {success}
        </p>
      ) : null}
    </div>
  )
}
