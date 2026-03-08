"use client"

import * as React from "react"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { apiFetch } from "../../../lib/api"
import { useAuth } from "../../../context/AuthContext"
import DomainManager from "../../../components/domain-manager/DomainManager"
import { DomainGovernanceCard } from "../../../components/domain-manager/DomainGovernanceCard"
import { KipApi } from "../../../lib/kipApi"
import type { DomainAdminFrameJson } from "../../data/domain-frame.types"
import { defaultDomainAdminFrame } from "../../data/domain-frame.default"

const ADMIN_SURFACE = {
  card: "hsl(var(--theme-surface-paper) / 0.88)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
}

interface DomainData {
  id: string
  name: string
  slug: string
  description?: string
  ownerId?: string
}

export interface DomainAdminContentProps {
  domainSlug: string
  adminLabels?: DomainAdminFrameJson
}

export function DomainAdminContent({ domainSlug, adminLabels = defaultDomainAdminFrame }: DomainAdminContentProps) {
  const { user, updateUser, authResolved, isLoading: authLoading } = useAuth()
  const [domain, setDomain] = React.useState<DomainData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [policyText, setPolicyText] = React.useState<string>("")
  const [policyVersion, setPolicyVersion] = React.useState<string>("policy-v1")
  const [policySource, setPolicySource] = React.useState<string>("default")
  const [policyError, setPolicyError] = React.useState<string | null>(null)
  const [isLoadingPolicy, setIsLoadingPolicy] = React.useState(false)
  const [isSavingPolicy, setIsSavingPolicy] = React.useState(false)
  const [profileForm, setProfileForm] = React.useState({ name: user?.name || "", email: user?.email || "" })
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileError, setProfileError] = React.useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (domainSlug) loadDomain()
  }, [domainSlug])

  React.useEffect(() => {
    setProfileForm({ name: user?.name || "", email: user?.email || "" })
  }, [user?.name, user?.email])

  React.useEffect(() => {
    if (domain?.id) loadPolicy(domain.id)
  }, [domain?.id])

  async function loadDomain() {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFetch(`/api/domains/by-slug/${domainSlug}`)
      if (response?.error || !response?.id) throw new Error("Domain not found")
      setDomain({
        id: response.id,
        name: response.name || response.slug,
        slug: response.slug,
        description: response.description,
        ownerId: response.ownerId,
      })
    } catch (err) {
      console.error("Error loading domain:", err)
      setError(adminLabels.messaging.domainNotFound)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadPolicy(domainId: string) {
    setIsLoadingPolicy(true)
    setPolicyError(null)
    try {
      const policy = await KipApi.getDomainPolicy(domainId)
      setPolicyVersion(policy.version || "policy-v1")
      setPolicySource(policy.source || "domain")
      setPolicyText(JSON.stringify((policy as { policy?: object })?.policy ?? {}, null, 2))
    } catch (err) {
      console.error("Error loading domain policy:", err)
      setPolicyError(err instanceof Error ? err.message : adminLabels.policy.messaging.loadError)
      setPolicyText(JSON.stringify({}, null, 2))
    } finally {
      setIsLoadingPolicy(false)
    }
  }

  async function handleSavePolicy() {
    if (!domain?.id) return
    setIsSavingPolicy(true)
    setPolicyError(null)
    try {
      const parsedPolicy = policyText.trim() ? JSON.parse(policyText) : {}
      const saved = await KipApi.updateDomainPolicy(domain.id, parsedPolicy, policyVersion)
      setPolicyVersion(saved.version || "policy-v1")
      setPolicySource(saved.source || "domain")
      setPolicyText(JSON.stringify((saved as { policy?: object })?.policy ?? parsedPolicy, null, 2))
    } catch (err) {
      console.error("Error saving domain policy:", err)
      setPolicyError(err instanceof Error ? err.message : adminLabels.policy.messaging.saveError)
    } finally {
      setIsSavingPolicy(false)
    }
  }

  async function handleProfileSave() {
    if (!user?.id) return
    setProfileSaving(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const data = await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: profileForm.name }),
      })
      if (data?.success) {
        updateUser(data.data)
        setProfileSuccess(adminLabels.profile.messaging.saveSuccess)
        setTimeout(() => setProfileSuccess(null), 3000)
      } else {
        setProfileError((data as { error?: string })?.error || adminLabels.profile.messaging.saveError)
      }
    } catch {
      setProfileError(adminLabels.profile.messaging.saveErrorRetry)
    } finally {
      setProfileSaving(false)
    }
  }

  if (authLoading || !authResolved) {
    return (
      <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.messaging.checkingAccess}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C96E59] mx-auto mb-4" />
          <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.messaging.loadingDomain}</p>
        </div>
      </div>
    )
  }

  if (error || !domain) {
    return (
      <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <h2 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.messaging.domainNotFound}</h2>
        <p className="mt-2 text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.messaging.domainNotFoundDetail}</p>
      </div>
    )
  }

  const isDomainOwner = Boolean(user?.id && domain.ownerId && domain.ownerId === user.id)
  if (!isDomainOwner) {
    return (
      <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <h2 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.messaging.adminRequired}</h2>
        <p className="mt-2 text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.messaging.adminRequiredDetail}</p>
      </div>
    )
  }

  const sourceMetaText = adminLabels.policy.messaging.sourceMeta
    .replace("{policySource}", policySource)
    .replace("{policyVersion}", policyVersion)

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.domain_manager.labels.heading}</h3>
          <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.domain_manager.messaging.description}</p>
        </div>
        <div className="h-[640px] overflow-hidden rounded-xl border" style={{ borderColor: ADMIN_SURFACE.border }}>
          <DomainManager scope="admin" allowCreate={true} />
        </div>
      </div>

      <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.profile.labels.heading}</h3>
            <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.profile.messaging.description}</p>
          </div>
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={profileSaving || !profileForm.name.trim()}
            className="inline-flex rounded-full border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
          >
            {profileSaving ? adminLabels.profile.labels.savingButton : adminLabels.profile.labels.saveButton}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.profile.labels.fullName}</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.profile.labels.email}</label>
            <input
              type="email"
              value={profileForm.email}
              disabled
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm opacity-70"
              style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)" }}
            />
          </div>
        </div>
        {profileError && <p className="mt-3 text-sm text-red-600">{profileError}</p>}
        {profileSuccess && <p className="mt-3 text-sm text-emerald-600">{profileSuccess}</p>}
      </div>

      <div className="space-y-4 rounded-2xl border px-6 py-6 shadow-sm" style={{ backgroundColor: ADMIN_SURFACE.card, borderColor: ADMIN_SURFACE.border }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.policy.labels.heading}</h3>
            <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.policy.messaging.description}</p>
            <p className="mt-1 text-xs" style={{ color: ADMIN_SURFACE.inkSecondary }}>{sourceMetaText}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => domain && loadPolicy(domain.id)}
              disabled={isLoadingPolicy || isSavingPolicy || !domain}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
            >
              <ArrowPathIcon className="h-4 w-4" />
              {adminLabels.policy.labels.refreshButton}
            </button>
            <button
              type="button"
              onClick={handleSavePolicy}
              disabled={isSavingPolicy || !domain}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-50"
              style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
            >
              {isSavingPolicy ? adminLabels.policy.labels.savingButton : adminLabels.policy.labels.saveButton}
            </button>
          </div>
        </div>
        {policyError && <p className="text-sm text-red-600">{policyError}</p>}
        <div className="space-y-2">
          <textarea
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            rows={16}
            className="w-full rounded-xl border px-3 py-2 font-mono text-xs"
            style={{ borderColor: ADMIN_SURFACE.border, backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)" }}
            disabled={isLoadingPolicy}
          />
          {isLoadingPolicy && <p className="text-sm" style={{ color: ADMIN_SURFACE.inkSecondary }}>{adminLabels.policy.messaging.loading}</p>}
        </div>
      </div>

      {domain?.id && <DomainGovernanceCard domainId={domain.id} />}
    </div>
  )
}
