"use client"

import * as React from "react"
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { ROLE_OPTIONS } from "@keeper/shared"
import { apiFetch } from "../../../lib/api"

export interface DomainMemberRow {
  userId: string
  name: string
  role: string
  permissions?: string[]
  expiresAt?: string
}

interface SearchUserRow {
  id: string
  name: string
  email: string
  createdAt?: string
}

export interface DomainPeopleSectionProps {
  domainId: string
}

const sectionLabelStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-tertiary))",
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

const rowStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
  background: "hsl(var(--theme-surface-paper) / 0.25)",
}

export function DomainPeopleSection({ domainId }: DomainPeopleSectionProps) {
  const [members, setMembers] = React.useState<DomainMemberRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAdd, setShowAdd] = React.useState(false)
  const [userSearch, setUserSearch] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchUserRow[]>([])
  const [selectedUser, setSelectedUser] = React.useState<SearchUserRow | null>(null)
  const [newMemberRole, setNewMemberRole] = React.useState("user")
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const loadMembers = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = (await apiFetch(`/api/domains/${domainId}/members`)) as {
        members?: DomainMemberRow[]
      }
      setMembers(Array.isArray(response.members) ? response.members : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members")
    } finally {
      setLoading(false)
    }
  }, [domainId])

  React.useEffect(() => {
    void loadMembers()
  }, [loadMembers])

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
      setSuccess("Member added")
      await loadMembers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member")
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
      setMembers((prev) =>
        prev.map((member) => (member.userId === userId ? { ...member, role } : member)),
      )
      setSuccess("Role updated")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role")
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
      setMembers((prev) => prev.filter((member) => member.userId !== userId))
      setSuccess("Member removed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <div
      className="mt-6 mb-4 pt-5 border-t"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={sectionLabelStyle}
        >
          People
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((open) => !open)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
          style={actionButtonStyle}
        >
          {showAdd ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add member"}
        </button>
      </div>

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
                    <span className="block text-[11px]" style={sectionLabelStyle}>
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
                <p className="text-[11px] truncate" style={sectionLabelStyle}>
                  {selectedUser.email}
                </p>
              </div>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="rounded-md px-2 py-1.5 text-xs"
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleAddMember()}
                disabled={adding}
                className="rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={actionButtonStyle}
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm" style={sectionLabelStyle}>
          Loading members…
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm" style={sectionLabelStyle}>
          No members yet. Add someone who should access this domain.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex flex-col gap-2 rounded-md px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              style={rowStyle}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-[11px] capitalize" style={sectionLabelStyle}>
                  {member.role}
                </p>
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
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
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
          ))}
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
