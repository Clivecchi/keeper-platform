"use client"

import * as React from "react"
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"
import {
  assignableDomainRoles,
  resolveDomainRoleCatalog,
  type DomainRoleCatalogEntry,
} from "@keeper/shared"
import { apiFetch } from "../../../lib/api"
import { DomainInvitePanel } from "./DomainInvitePanel"
import { DomainRolesEditor, type RoleDraft } from "./DomainRolesEditor"
import {
  formatPeopleDate,
  invitationAcceptUrl,
  parseDomainPeoplePayloads,
  peopleMutationFeedback,
  peopleSeedLines,
  resolveRoleInfo,
  type DomainMemberRow,
  type DomainOwnerRow,
  type PendingInvitationRow,
} from "./domainPeople"

export type { DomainMemberRow, DomainOwnerRow, PendingInvitationRow }

export interface DomainPeopleSectionProps {
  domainId: string
  /** Hide stacked-section chrome when this is its own Domain Card frame. */
  embedded?: boolean
  /** Agency Nav — emphasize this person inside the shared People room. */
  highlightUserId?: string | null
  /** Incremented when Cast / profile Invite asks Chronicle to open this form. */
  inviteRequestId?: number
}

interface SearchUserRow {
  id: string
  name: string
  email: string
  createdAt?: string
}

const sectionLabelStyle: React.CSSProperties = {
  color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))",
}

const quietStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-secondary))",
}

const inputStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "var(--treatment-paper, hsl(var(--theme-surface-paper)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

const actionOutlineStyle: React.CSSProperties = {
  border: "1px solid var(--treatment-accent, hsl(var(--theme-border-soft)))",
  color: "var(--treatment-accent, hsl(var(--theme-ink-primary)))",
  background: "transparent",
}

const actionFilledStyle: React.CSSProperties = {
  border: "1px solid var(--treatment-action, hsl(var(--theme-accent-primary)))",
  background: "var(--treatment-action, hsl(var(--theme-accent-primary)))",
  color: "var(--treatment-action-ink, hsl(var(--theme-surface-paper)))",
}

const rowStyle: React.CSSProperties = {
  background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))",
  boxShadow: "inset 3px 0 0 var(--treatment-accent, hsl(var(--theme-border-strong)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

function personRowStyle(highlighted: boolean): React.CSSProperties {
  if (!highlighted) return rowStyle
  return {
    ...rowStyle,
    boxShadow:
      "inset 3px 0 0 var(--treatment-action, hsl(var(--theme-accent-primary))), 0 0 0 1px var(--treatment-action, hsl(var(--theme-accent-primary)))",
  }
}

const listScrollStyle: React.CSSProperties = {
  maxHeight: "16rem",
  overflowY: "auto",
  overscrollBehavior: "contain",
}

export function DomainPeopleSection({
  domainId,
  embedded = false,
  highlightUserId = null,
  inviteRequestId = 0,
}: DomainPeopleSectionProps) {
  const [owner, setOwner] = React.useState<DomainOwnerRow | null>(null)
  const [members, setMembers] = React.useState<DomainMemberRow[]>([])
  const [pendingInvitations, setPendingInvitations] = React.useState<PendingInvitationRow[]>([])
  const [roles, setRoles] = React.useState<DomainRoleCatalogEntry[]>(() => resolveDomainRoleCatalog({}))
  const [busyRoleKey, setBusyRoleKey] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [showAdd, setShowAdd] = React.useState(false)
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [userSearch, setUserSearch] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchUserRow[]>([])
  const [selectedUser, setSelectedUser] = React.useState<SearchUserRow | null>(null)
  const [newMemberRole, setNewMemberRole] = React.useState("user")
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null)
  const [copyingInviteId, setCopyingInviteId] = React.useState<string | null>(null)
  const [resendingInviteId, setResendingInviteId] = React.useState<string | null>(null)
  const [revokingInviteId, setRevokingInviteId] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const resetLocalForms = React.useCallback(() => {
    setShowAdd(false)
    setInviteOpen(false)
    setUserSearch("")
    setSearchResults([])
    setSelectedUser(null)
    setNewMemberRole("user")
    setBusyUserId(null)
    setCopyingInviteId(null)
    setResendingInviteId(null)
    setRevokingInviteId(null)
  }, [])

  const loadPeople = React.useCallback(async () => {
    setLoading(true)
    try {
      const [membersResponse, connectionsResponse] = await Promise.all([
        apiFetch(`/api/domains/${domainId}/members`) as Promise<{
          owner?: DomainOwnerRow | null
          members?: DomainMemberRow[]
          pendingInvitations?: PendingInvitationRow[]
          roles?: DomainRoleCatalogEntry[]
        }>,
        apiFetch(`/api/domains/${domainId}/connections`) as Promise<{
          pendingInvitations?: PendingInvitationRow[]
        }>,
      ])

      const parsed = parseDomainPeoplePayloads(membersResponse, connectionsResponse)
      setOwner(parsed.owner)
      setMembers(parsed.members)
      setPendingInvitations(parsed.pendingInvitations)
      setRoles(parsed.roles)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load people")
      setOwner(null)
      setMembers([])
      setPendingInvitations([])
      setRoles(resolveDomainRoleCatalog({}))
    } finally {
      setLoading(false)
    }
  }, [domainId])

  React.useEffect(() => {
    resetLocalForms()
    setError(null)
    setSuccess(null)
    void loadPeople()
  }, [domainId, loadPeople, resetLocalForms])

  React.useEffect(() => {
    if (inviteRequestId <= 0) return
    setInviteOpen(true)
    setShowAdd(false)
  }, [inviteRequestId])

  React.useEffect(() => {
    if (!showAdd) return
    const query = userSearch.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    const timer = window.setTimeout(async () => {
      try {
        const users = (await apiFetch(
          `/api/domains/users/search?query=${encodeURIComponent(query)}`,
        )) as SearchUserRow[]
        setSearchResults(Array.isArray(users) ? users : [])
      } catch {
        setSearchResults([])
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [userSearch, showAdd])

  React.useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 3000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleAddMember = async () => {
    if (!selectedUser) return
    if (owner?.userId === selectedUser.id) {
      setError("The owner already belongs to this domain.")
      return
    }
    setAdding(true)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser.id, role: newMemberRole }),
      })
      setShowAdd(false)
      setUserSearch("")
      setSearchResults([])
      setSelectedUser(null)
      setNewMemberRole("user")
      setSuccess(peopleMutationFeedback("member-added").message)
      await loadPeople()
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    setBusyUserId(userId)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      })
      setSuccess(peopleMutationFeedback("role-updated").message)
      await loadPeople()
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Remove this member from the domain?")) return
    setBusyUserId(userId)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}/members/${userId}`, {
        method: "DELETE",
      })
      setSuccess(peopleMutationFeedback("member-removed").message)
      await loadPeople()
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setBusyUserId(null)
    }
  }

  const handleRevokeInvitation = async (invitation: PendingInvitationRow) => {
    setRevokingInviteId(invitation.id)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}/invitations/${invitation.id}`, {
        method: "DELETE",
      })
      setSuccess(peopleMutationFeedback("invite-revoked").message)
      await loadPeople()
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setRevokingInviteId(null)
    }
  }

  const handleResendInvitation = async (invitation: PendingInvitationRow) => {
    setResendingInviteId(invitation.id)
    setError(null)
    try {
      await apiFetch(`/api/domains/${domainId}/invitations/${invitation.id}/resend`, {
        method: "POST",
      })
      setSuccess(peopleMutationFeedback("invite-resent").message)
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setResendingInviteId(null)
    }
  }

  const applyRoleCatalog = (next: unknown) => {
    const payload = next as { roles?: DomainRoleCatalogEntry[] }
    if (Array.isArray(payload.roles)) setRoles(payload.roles)
  }

  const handleSaveRole = async (entry: DomainRoleCatalogEntry, draft: RoleDraft) => {
    setBusyRoleKey(entry.key)
    setError(null)
    try {
      applyRoleCatalog(
        await apiFetch(`/api/domains/${domainId}/roles/${encodeURIComponent(entry.key)}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: draft.label,
            description: draft.description,
            ...(entry.kind === "custom" ? { mapsTo: draft.mapsTo } : {}),
          }),
        }),
      )
      setSuccess(peopleMutationFeedback("role-saved").message)
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
      throw err
    } finally {
      setBusyRoleKey(null)
    }
  }

  const handleCreateRole = async (draft: RoleDraft) => {
    setBusyRoleKey("new")
    setError(null)
    try {
      applyRoleCatalog(
        await apiFetch(`/api/domains/${domainId}/roles`, {
          method: "POST",
          body: JSON.stringify({
            name: draft.label,
            description: draft.description,
            mapsTo: draft.mapsTo,
          }),
        }),
      )
      setSuccess(peopleMutationFeedback("role-added").message)
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
      throw err
    } finally {
      setBusyRoleKey(null)
    }
  }

  const handleDeleteRole = async (entry: DomainRoleCatalogEntry) => {
    if (!window.confirm(`Remove ${entry.label}? People with this role keep the same permissions.`)) return
    setBusyRoleKey(entry.key)
    setError(null)
    try {
      applyRoleCatalog(
        await apiFetch(`/api/domains/${domainId}/roles/${encodeURIComponent(entry.key)}`, {
          method: "DELETE",
        }),
      )
      setSuccess(peopleMutationFeedback("role-removed").message)
      await loadPeople()
    } catch (err) {
      setError(peopleMutationFeedback("failed", err instanceof Error ? err.message : undefined).message)
    } finally {
      setBusyRoleKey(null)
    }
  }

  const handleCopyAcceptLink = async (invitation: PendingInvitationRow) => {
    const acceptUrl = invitationAcceptUrl(invitation.acceptPath)
    if (!acceptUrl) {
      setError("No acceptance link is available for this invitation.")
      return
    }
    setCopyingInviteId(invitation.id)
    setError(null)
    try {
      await navigator.clipboard.writeText(acceptUrl)
      setSuccess("Acceptance link copied")
    } catch {
      setError("Could not copy the link. Select it from the invitation details.")
    } finally {
      setCopyingInviteId(null)
    }
  }

  return (
    <div
      className={embedded ? "mb-2" : "mt-6 mb-4 pt-5 border-t"}
      style={embedded ? undefined : { borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        {embedded ? (
          <p className="text-[13px]" style={{ color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))" }}>
            Owner is ownership, not a role you assign. Invite opens here in Chronicle —
            not a popup. Brief the lead about the person. You can also invite them onto
            other Domains you administer.
          </p>
        ) : (
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={sectionLabelStyle}
          >
            People
          </p>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setInviteOpen(true)
              setShowAdd(false)
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
            style={actionOutlineStyle}
          >
            Invite
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
            style={showAdd ? actionOutlineStyle : actionFilledStyle}
          >
            {showAdd ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
            {showAdd ? "Cancel" : "Add existing"}
          </button>
        </div>
      </div>

      {inviteOpen ? (
        <DomainInvitePanel
          domainId={domainId}
          roles={roles}
          onClose={() => setInviteOpen(false)}
          onSettled={(outcome, emailSent) => {
            const kind =
              outcome === "granted"
                ? "granted"
                : emailSent === false
                  ? "invite-created"
                  : "invited"
            setSuccess(peopleMutationFeedback(kind).message)
            void loadPeople()
          }}
        />
      ) : null}

      {showAdd ? (
        <div className="rounded-md p-3 mb-3 space-y-3" style={rowStyle}>
          <div className="relative">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-md px-3 py-2 text-sm"
              style={inputStyle}
            />
            {searchResults.length > 0 && !selectedUser ? (
              <div
                className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-md border"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                  background: "hsl(var(--theme-surface-paper) / 0.98)",
                }}
              >
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user)
                      setUserSearch(user.name || user.email)
                      setSearchResults([])
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:opacity-90"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    <span className="font-medium">{user.name || "Unnamed"}</span>
                    <span className="block text-[11px]" style={quietStyle}>
                      {user.email}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {selectedUser ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium truncate">{selectedUser.name || selectedUser.email}</p>
                <p className="text-[11px] truncate" style={quietStyle}>
                  {selectedUser.email}
                </p>
              </div>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="rounded-md px-2 py-1.5 text-xs"
                style={inputStyle}
              >
                {assignableDomainRoles(roles).map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} — {option.description}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAddMember()}
                disabled={adding}
                className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={actionFilledStyle}
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm" style={quietStyle}>
          Loading people…
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={sectionLabelStyle}
            >
              Roles
            </p>
            <DomainRolesEditor
              roles={roles}
              busyKey={busyRoleKey}
              onSave={handleSaveRole}
              onCreate={handleCreateRole}
              onDelete={handleDeleteRole}
            />
          </div>

          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={sectionLabelStyle}
            >
              Owner
            </p>
            {owner ? (
              <div
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5"
                style={personRowStyle(Boolean(highlightUserId && owner.userId === highlightUserId))}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{owner.name}</p>
                  {owner.email ? (
                    <p className="text-[11px] truncate" style={quietStyle}>
                      {owner.email}
                    </p>
                  ) : null}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    color: "var(--treatment-signal, hsl(var(--theme-status-success)))",
                    border: "1px solid var(--treatment-signal, hsl(var(--theme-status-success)))",
                  }}
                >
                  {resolveRoleInfo("owner", roles).label}
                </span>
              </div>
            ) : (
              <p className="text-sm" style={quietStyle}>
                Owner could not be loaded.
              </p>
            )}
          </div>

          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={sectionLabelStyle}
            >
              Members
            </p>
            {members.length === 0 ? (
              <p className="text-sm" style={quietStyle}>
                No members yet. Invite someone, or add a person who already has a Keeper
                account.
              </p>
            ) : (
              <div className="space-y-2" style={listScrollStyle}>
                {members.map((member) => {
                  const roleInfo = resolveRoleInfo(member.role, roles)
                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col gap-2 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      style={personRowStyle(Boolean(highlightUserId && member.userId === highlightUserId))}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-[11px]" style={quietStyle}>
                          {roleInfo.label} — {roleInfo.description}
                        </p>
                        {peopleSeedLines(member.seed).map((line) => (
                          <p key={line} className="text-[11px] mt-0.5" style={quietStyle}>
                            {line}
                          </p>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={member.role}
                          disabled={busyUserId === member.userId}
                          onChange={(e) =>
                            void handleUpdateMemberRole(member.userId, e.target.value)
                          }
                          className="rounded-md px-2 py-1 text-xs disabled:opacity-50"
                          style={inputStyle}
                          aria-label={`Role for ${member.name}`}
                        >
                          {assignableDomainRoles(roles).map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member.userId)}
                          disabled={busyUserId === member.userId}
                          className="rounded-md p-1 disabled:opacity-50"
                          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                          aria-label={`Remove ${member.name}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={sectionLabelStyle}
            >
              Pending invitations
            </p>
            {pendingInvitations.length === 0 ? (
              <p className="text-sm" style={quietStyle}>
                No pending invitations. Invite emails the person a Keeper acceptance link.
                You can still copy the link if you need to share it yourself.
              </p>
            ) : (
              <div className="space-y-2" style={listScrollStyle}>
                {pendingInvitations.map((invitation) => {
                  const roleInfo = resolveRoleInfo(invitation.role, roles)
                  const created = formatPeopleDate(invitation.createdAt)
                  const expires = formatPeopleDate(invitation.expiresAt)
                  const acceptUrl = invitationAcceptUrl(invitation.acceptPath)
                  return (
                    <div key={invitation.id} className="rounded-md px-3 py-2 space-y-1.5" style={rowStyle}>
                      <p className="text-sm font-medium truncate">{invitation.email}</p>
                      <p className="text-[11px]" style={quietStyle}>
                        {roleInfo.label} — pending
                        {created ? ` · invited ${created}` : ""}
                        {expires ? ` · expires ${expires}` : ""}
                      </p>
                      {peopleSeedLines(invitation.seed).map((line) => (
                        <p key={line} className="text-[11px]" style={quietStyle}>
                          {line}
                        </p>
                      ))}
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        {acceptUrl ? (
                          <code
                            className="block min-w-0 flex-1 break-all rounded px-2 py-1 text-[11px]"
                            style={{
                              ...inputStyle,
                              background: "hsl(var(--theme-surface-paper) / 0.35)",
                            }}
                          >
                            {acceptUrl}
                          </code>
                        ) : (
                          <span className="flex-1 text-[11px]" style={quietStyle}>
                            Acceptance link unavailable — you can still email the invitation.
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleResendInvitation(invitation)}
                          disabled={resendingInviteId === invitation.id}
                          className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                          style={actionOutlineStyle}
                        >
                          {resendingInviteId === invitation.id ? "Sending…" : "Resend email"}
                        </button>
                        {acceptUrl ? (
                          <button
                            type="button"
                            onClick={() => void handleCopyAcceptLink(invitation)}
                            disabled={copyingInviteId === invitation.id}
                            className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                            style={actionOutlineStyle}
                          >
                            {copyingInviteId === invitation.id ? "Copying…" : "Copy link"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleRevokeInvitation(invitation)}
                          disabled={revokingInviteId === invitation.id}
                          className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50 shrink-0"
                          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                        >
                          {revokingInviteId === invitation.id ? "Removing…" : "Revoke"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {error ? (
        <p
          className="text-[12px] mt-2"
          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="text-[12px] mt-2"
          style={{ color: "hsl(var(--theme-status-success, 142 71% 45%))" }}
        >
          {success}
        </p>
      ) : null}
    </div>
  )
}
