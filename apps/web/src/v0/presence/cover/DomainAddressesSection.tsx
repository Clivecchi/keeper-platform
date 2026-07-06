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
  /** Platform-unique domain tag (maps to slug). Saved via Configure Save bar. */
  domainTag: string
  onDomainTagChange: (value: string) => void
  domainTagError?: string
  customDomain?: string | null
  customDomainVerified?: boolean
  onAddressesUpdated?: (patch: {
    customDomain?: string | null
    customDomainVerified?: boolean
  }) => void
}

interface DnsStatusPayload {
  attached?: boolean
  configured?: boolean
  verified?: boolean
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
  color: "hsl(var(--theme-ink-tertiary))",
}

const readOnlyBoxStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "hsl(var(--theme-surface-paper) / 0.35)",
  color: "hsl(var(--theme-ink-primary))",
}

const inputStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "hsl(var(--theme-surface-paper) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
}

const actionButtonStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  color: "hsl(var(--theme-ink-primary))",
  background: "hsl(var(--theme-surface-paper) / 0.65)",
}

export function DomainAddressesSection({
  domainId,
  domainTag,
  onDomainTagChange,
  domainTagError,
  customDomain: customDomainProp,
  customDomainVerified: customDomainVerifiedProp = false,
  onAddressesUpdated,
}: DomainAddressesSectionProps) {
  const [draftCustomDomain, setDraftCustomDomain] = React.useState("")
  const [savedCustomDomain, setSavedCustomDomain] = React.useState(
    customDomainProp?.trim() ?? "",
  )
  const [customDomainVerified, setCustomDomainVerified] = React.useState(
    customDomainVerifiedProp,
  )
  const [dnsStatus, setDnsStatus] = React.useState<DnsStatusPayload | null>(null)
  const [loadingDns, setLoadingDns] = React.useState(false)
  const [addingCustomDomain, setAddingCustomDomain] = React.useState(false)
  const [addingToVercel, setAddingToVercel] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const keeperHostname = React.useMemo(
    () => buildKeeperTenantHostname(domainTag),
    [domainTag],
  )

  React.useEffect(() => {
    setSavedCustomDomain(customDomainProp?.trim() ?? "")
    setCustomDomainVerified(customDomainVerifiedProp)
  }, [customDomainProp, customDomainVerifiedProp])

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

  React.useEffect(() => {
    if (savedCustomDomain) {
      void loadDnsStatus()
    } else {
      setDnsStatus(null)
    }
  }, [savedCustomDomain, loadDnsStatus])

  React.useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleAddCustomDomain = async () => {
    const trimmed = draftCustomDomain.trim().toLowerCase()
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
      setDraftCustomDomain("")
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
        `Remove custom domain "${savedCustomDomain}"? Traffic will use ${keeperHostname} until you add another.`,
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
      setDraftCustomDomain("")
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

  return (
    <div className="mt-6 mb-4 pt-5 border-t" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}>
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-3"
        style={sectionLabelStyle}
      >
        Addresses
      </p>

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
        <p className="text-[11px] mt-1" style={sectionLabelStyle}>
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
          https://{keeperHostname}
        </div>
        <p className="text-[11px] mt-1" style={sectionLabelStyle}>
          Derived from your domain tag. Attach{" "}
          <span className="font-mono">{keeperHostname}</span> in Vercel when you are ready for
          tenant hosting.
        </p>
      </div>

      <div className="mb-4">
        <p className="keeper-presence-field-label mb-1.5">Custom domain</p>
        {!savedCustomDomain ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={draftCustomDomain}
              onChange={(e) => setDraftCustomDomain(e.target.value)}
              placeholder="livecchi.us"
              className="flex-1 rounded-md px-3 py-2 text-sm"
              style={inputStyle}
              disabled={addingCustomDomain}
            />
            <button
              type="button"
              onClick={() => void handleAddCustomDomain()}
              disabled={addingCustomDomain || !draftCustomDomain.trim()}
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
                    <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--theme-ink-tertiary))" }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Add to Vercel</p>
                    <p className="text-[11px]" style={sectionLabelStyle}>
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
                      <ClockIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "hsl(var(--theme-ink-tertiary))" }} />
                    )}
                    <div>
                      <p className="text-sm font-medium">DNS &amp; verification</p>
                      <p className="text-[11px]" style={sectionLabelStyle}>
                        {dnsVerified
                          ? "Verified — SSL will issue automatically"
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
        <p className="text-[11px] mt-2" style={sectionLabelStyle}>
          Optional public brand URL (e.g. livecchi.us). Separate from your Keeper address above.
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
