// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  formatPeopleDate,
  invitationAcceptUrl,
  parseDomainPeoplePayloads,
  peopleMutationFeedback,
  resolveRoleInfo,
} from "./domainPeople"

describe("domainPeople helpers", () => {
  it("keeps the owner out of the members list without inventing a permission row", () => {
    const parsed = parseDomainPeoplePayloads(
      {
        owner: { userId: "owner-1", name: "Chuck Livecchi", email: "chuck@example.com" },
        members: [
          { userId: "owner-1", name: "Chuck Livecchi", role: "admin" },
          { userId: "member-1", name: "Pat", role: "user" },
        ],
      },
      { pendingInvitations: [] },
    )

    expect(parsed.owner?.userId).toBe("owner-1")
    expect(parsed.members).toEqual([{ userId: "member-1", name: "Pat", role: "user" }])
    expect(parsed.pendingInvitations).toEqual([])
  })

  it("does not treat an authenticated user as a member when no permission rows exist", () => {
    const parsed = parseDomainPeoplePayloads({ owner: null, members: [] }, {})
    expect(parsed.owner).toBeNull()
    expect(parsed.members).toEqual([])
    expect(parsed.pendingInvitations).toEqual([])
  })

  it("keeps pending invitations distinct from members", () => {
    const parsed = parseDomainPeoplePayloads(
      {
        owner: { userId: "owner-1", name: "Chuck" },
        members: [{ userId: "member-1", name: "Pat", role: "friend" }],
      },
      {
        pendingInvitations: [
          {
            id: "inv-1",
            email: "new@example.com",
            role: "connection",
            status: "pending",
            acceptPath: "/invite/accept?token=abc",
          },
        ],
      },
    )

    expect(parsed.members.map((member) => member.userId)).toEqual(["member-1"])
    expect(parsed.pendingInvitations).toHaveLength(1)
    expect(parsed.pendingInvitations[0]?.email).toBe("new@example.com")
    expect(parsed.pendingInvitations[0]?.status).toBe("pending")
  })

  it("surfaces ROLE_MAP labels and descriptions", () => {
    expect(resolveRoleInfo("admin")).toEqual({
      label: "Admin",
      description: "Full access to manage the domain",
    })
    expect(resolveRoleInfo("connection").label).toBe("Connection")
    expect(resolveRoleInfo("custom").label).toBe("custom")
  })

  it("builds a copyable acceptance URL from the stored path", () => {
    expect(invitationAcceptUrl("/invite/accept?token=abc", "https://ke3p.com")).toBe(
      "https://ke3p.com/invite/accept?token=abc",
    )
    expect(invitationAcceptUrl("https://ke3p.com/invite/accept?token=abc")).toBe(
      "https://ke3p.com/invite/accept?token=abc",
    )
    expect(invitationAcceptUrl(null)).toBeNull()
  })

  it("formats invitation dates when the value is valid", () => {
    expect(formatPeopleDate("not-a-date")).toBeNull()
    expect(formatPeopleDate("2026-09-12T12:00:00.000Z")).toMatch(/2026/)
  })

  it("reports invitation created, not emailed, and never reports success on failure", () => {
    expect(peopleMutationFeedback("invited").message).toBe("Invitation created")
    expect(peopleMutationFeedback("granted").message).toBe("Member added")
    expect(peopleMutationFeedback("failed", "No permission").ok).toBe(false)
    expect(peopleMutationFeedback("failed", "No permission").message).toBe("No permission")
  })
})
