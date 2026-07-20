"use client"

import * as React from "react"
import { apiFetch } from "../../lib/api"
import type { DomainAccessKeyRecord } from "@keeper/shared"
import { useAuth } from "../../context/AuthContext"
import { ChronicleTreatmentShell } from "../treatment/ChronicleTreatmentShell"
import type { ResolvedDomainTreatment } from "../treatment/resolveDomainTreatment"
import type { DomainMemberRow } from "../presence/cover/DomainPeopleSection"

/** Personal-agent identity for the signed-in member (primary domain lead). */
export interface PersonalAgentIdentity {
  slug: string
  name: string
}

type DomainLeadRow = {
  isPrimary?: boolean
  leadAgentSlug?: string | null
  leadAgentName?: string | null
}

async function fetchPersonalAgentIdentity(): Promise<PersonalAgentIdentity | null> {
  try {
    const rows = (await apiFetch("/api/domains/my")) as DomainLeadRow[] | { error?: string }
    if (!Array.isArray(rows) || rows.length === 0) return null
    const primary = rows.find((row) => row.isPrimary) ?? rows[0]
    const slug = primary?.leadAgentSlug?.trim()
    const name = primary?.leadAgentName?.trim()
    if (!slug || !name) return null
    return { slug, name }
  } catch {
    return null
  }
}

export type CastMemberStatus = "active" | "present" | "access-unconfirmed"

export interface CastMemberChip {
  id: string
  label: string
  status: CastMemberStatus
  kind: "agent" | "person"
  slug?: string
}

export interface DialogCastBarProps {
  domainId: string | null
  treatment: ResolvedDomainTreatment
  /** Domain lead agent slug — shown as active. */
  leadAgentSlug?: string | null
  leadAgentName?: string | null
  /** Support agents from domain roster. */
  supportAgents?: ReadonlyArray<{ slug: string; name: string }>
  activeSlug?: string | null
  onInvokeAgent?: (slug: string) => void
  onInvite?: () => void
  onManageAccess?: () => void
}

async function fetchAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const data = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
  )) as { keys?: DomainAccessKeyRecord[] }
  return data.keys ?? []
}

async function fetchMembers(domainId: string): Promise<DomainMemberRow[]> {
  try {
    const response = (await apiFetch(
      `/api/domains/${encodeURIComponent(domainId)}/members`,
    )) as { members?: DomainMemberRow[] }
    return Array.isArray(response.members) ? response.members : []
  } catch {
    return []
  }
}

function statusDotColor(status: CastMemberStatus): string {
  switch (status) {
    case "active":
      return "hsl(var(--theme-ink-primary))"
    case "present":
      return "hsl(var(--theme-status-success, var(--theme-ink-secondary)))"
    case "access-unconfirmed":
      return "hsl(var(--theme-ink-tertiary))"
  }
}

function CastChip({
  chip,
  isActive,
  onClick,
}: {
  chip: CastMemberChip
  isActive?: boolean
  onClick?: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const statusLabel =
    chip.status === "active"
      ? "Active"
      : chip.status === "present"
        ? "Present"
        : "Access unconfirmed"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${chip.label} — ${statusLabel}`}
      title={`${chip.label} — ${statusLabel}`}
      aria-pressed={isActive}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        border: `1px solid ${isActive ? "hsl(var(--theme-ink-primary) / 0.35)" : "hsl(var(--theme-border-soft) / 0.4)"}`,
        borderRadius: "999px",
        backgroundColor: isActive
          ? "hsl(var(--theme-surface-elevated) / 0.9)"
          : hovered
            ? "hsl(var(--theme-surface-paper) / 0.8)"
            : "hsl(var(--theme-surface-paper) / 0.35)",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 100ms ease, border-color 100ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: statusDotColor(chip.status),
          flexShrink: 0,
        }}
      />
      <span
        className="text-xs"
        style={{
          color: isActive
            ? "var(--theme-ink-primary-color)"
            : "var(--theme-ink-secondary-color)",
          fontWeight: isActive ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {chip.label}
      </span>
    </button>
  )
}

export function DialogCastBar({
  domainId,
  treatment,
  leadAgentSlug,
  leadAgentName,
  supportAgents = [],
  activeSlug = null,
  onInvokeAgent,
  onInvite,
  onManageAccess,
}: DialogCastBarProps) {
  const { user } = useAuth()
  const [members, setMembers] = React.useState<DomainMemberRow[]>([])
  const [keys, setKeys] = React.useState<DomainAccessKeyRecord[]>([])
  const [personalAgent, setPersonalAgent] = React.useState<PersonalAgentIdentity | null>(null)

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    void Promise.all([
      fetchMembers(domainId),
      fetchAccessKeys(domainId),
      fetchPersonalAgentIdentity(),
    ]).then(([memberRows, keyRows, personal]) => {
      if (!cancelled) {
        setMembers(memberRows)
        setKeys(keyRows)
        setPersonalAgent(personal)
      }
    })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const chips = React.useMemo((): CastMemberChip[] => {
    const result: CastMemberChip[] = []
    const activeKeyCount = keys.filter((k) => k.status === "active").length
    const personalSlug = personalAgent?.slug?.trim().toLowerCase() || null
    const currentUserId = user?.id ? String(user.id) : null

    if (leadAgentSlug) {
      result.push({
        id: `agent:${leadAgentSlug}`,
        slug: leadAgentSlug,
        label: leadAgentName?.trim() || leadAgentSlug,
        status: activeSlug === leadAgentSlug ? "active" : "present",
        kind: "agent",
      })
    }

    for (const agent of supportAgents) {
      if (agent.slug === leadAgentSlug) continue
      // Personal agent represents the human — one chip, not agent + person.
      if (personalSlug && agent.slug.trim().toLowerCase() === personalSlug) continue
      result.push({
        id: `agent:${agent.slug}`,
        slug: agent.slug,
        label: agent.name,
        status: activeSlug === agent.slug ? "active" : "present",
        kind: "agent",
      })
    }

    for (const member of members) {
      const isCurrentUser = currentUserId != null && String(member.userId) === currentUserId
      const resolvedPersona =
        isCurrentUser && personalAgent?.name?.trim() ? personalAgent : null
      result.push({
        id: `person:${member.userId}`,
        label: resolvedPersona?.name.trim() || member.name?.trim() || "Member",
        status: activeKeyCount > 0 ? "present" : "access-unconfirmed",
        kind: "person",
        ...(resolvedPersona?.slug ? { slug: resolvedPersona.slug } : {}),
      })
    }

    return result
  }, [
    leadAgentSlug,
    leadAgentName,
    supportAgents,
    members,
    keys,
    activeSlug,
    personalAgent,
    user?.id,
  ])

  const handleGetKey = React.useCallback(async () => {
    if (!domainId) return
    const label = `Cast key — ${new Date().toLocaleDateString()}`
    try {
      const data = (await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
        {
          method: "POST",
          body: JSON.stringify({ label, scopes: ["library.ro", "gloss.rw"] }),
        },
      )) as { key?: DomainAccessKeyRecord & { secret: string } }
      if (data.key?.secret) {
        try {
          await navigator.clipboard.writeText(data.key.secret)
        } catch {
          /* user copies manually */
        }
      }
      const keyRows = await fetchAccessKeys(domainId)
      setKeys(keyRows)
    } catch {
      onManageAccess?.()
    }
  }, [domainId, onManageAccess])

  const bar = (
    <div
      role="presentation"
      style={{ userSelect: "none", flex: 1, minWidth: 0 }}
    >
      <div
        className="dialog-services-bar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "5px 0 6px",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "hsl(var(--theme-ink-placeholder))",
            letterSpacing: "0.04em",
            flexShrink: 0,
            marginRight: "12px",
          }}
        >
          Cast
        </span>
        <span
          style={{
            display: "inline-block",
            width: "1px",
            height: "12px",
            backgroundColor: "hsl(var(--theme-line-hairline))",
            flexShrink: 0,
            marginRight: "12px",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <CastChip
              key={chip.id}
              chip={chip}
              isActive={chip.slug ? activeSlug === chip.slug : false}
              onClick={
                chip.slug && onInvokeAgent ? () => onInvokeAgent(chip.slug!) : undefined
              }
            />
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexShrink: 0 }}>
          {onInvite ? (
            <button
              type="button"
              className="text-[11px] underline underline-offset-2"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              onClick={onInvite}
            >
              Invite
            </button>
          ) : null}
          <button
            type="button"
            className="text-[11px] underline underline-offset-2"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
            onClick={() => void handleGetKey()}
            disabled={!domainId}
          >
            Get key
          </button>
          {onManageAccess ? (
            <button
              type="button"
              className="text-[11px] underline underline-offset-2"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              onClick={onManageAccess}
            >
              Manage
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )

  return <ChronicleTreatmentShell treatment={treatment}>{bar}</ChronicleTreatmentShell>
}
