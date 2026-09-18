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
    expect(parsed.roles.map((role) => role.key)).toEqual([
      "owner",
      "admin",
      "user",
      "friend",
      "connection",
    ])
  })

  it("does not treat an authenticated user as a member when no permission rows exist", () => {
    const parsed = parseDomainPeoplePayloads({ owner: null, members: [] }, {})
    expect(parsed.owner).toBeNull()
    expect(parsed.members).toEqual([])
    expect(parsed.pendingInvitations).toEqual([])
  })

  it("prefers pending invitations from members so admin and user invites are not dropped", () => {
    const parsed = parseDomainPeoplePayloads(
      {
        owner: { userId: "owner-1", name: "Chuck" },
        members: [],
        pendingInvitations: [
          {
            id: "inv-admin",
            email: "pat@example.com",
            role: "admin",
            status: "pending",
            acceptPath: "/invite/accept?token=a",
            seed: { givenName: "Pat", about: "Knows the Cover work." },
          },
        ],
      },
      {
        pendingInvitations: [
          {
            id: "inv-connection-only",
            email: "other@example.com",
            role: "connection",
            status: "pending",
          },
        ],
      },
    )

    expect(parsed.pendingInvitations.map((invitation) => invitation.role)).toEqual(["admin"])
    expect(parsed.pendingInvitations[0]?.seed).toEqual({
      givenName: "Pat",
      about: "Knows the Cover work.",
    })
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

  it("keeps hasAccount on pending invitations so People can show registered-not-arrived", () => {
    const parsed = parseDomainPeoplePayloads({
      owner: { userId: "owner-1", name: "Chuck" },
      members: [],
      pendingInvitations: [
        {
          id: "inv-1",
          email: "sheyenne@example.com",
          role: "bride",
          status: "pending",
          hasAccount: true,
          accountName: "Sheyenne",
        },
      ],
    })
    expect(parsed.pendingInvitations[0]?.hasAccount).toBe(true)
    expect(parsed.pendingInvitations[0]?.accountName).toBe("Sheyenne")
  })

  it("surfaces ROLE_MAP labels and catalog overrides", () => {
    expect(resolveRoleInfo("admin")).toEqual({
      label: "Admin",
      description: "Manage People, Config, and invitations on this Domain.",
    })
    expect(resolveRoleInfo("user").label).toBe("Member")
    expect(resolveRoleInfo("connection").label).toBe("Connection")
    expect(resolveRoleInfo("custom").label).toBe("custom")
    expect(resolveRoleInfo("patron", [
      {
        key: "patron",
        kind: "custom",
        label: "Patron",
        description: "Supports the work.",
        mapsTo: "friend",
        assignable: true,
        locked: false,
      },
    ])).toEqual({
      label: "Patron",
      description: "Supports the work.",
    })
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

  it("reports emailed invitations honestly, and never reports success on failure", () => {
    expect(peopleMutationFeedback("invited").message).toBe("Invitation emailed")
    expect(peopleMutationFeedback("invite-created").message).toBe(
      "Invitation created — email could not be sent",
    )
    expect(peopleMutationFeedback("invite-resent").message).toBe("Invitation emailed again")
    expect(peopleMutationFeedback("granted").message).toBe("Member added")
    expect(peopleMutationFeedback("failed", "No permission").ok).toBe(false)
    expect(peopleMutationFeedback("failed", "No permission").message).toBe("No permission")
  })
})
