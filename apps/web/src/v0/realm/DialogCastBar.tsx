"use client"

/**
 * Realm cast access actions — trailing chrome for BoardInstrumentsBar.
 *
 * Agent roster + invocation live on BoardInstrumentsBar (shared director
 * pattern). This module only owns Realm-specific access-key / invite links
 * that sit to the right of the Agents chips.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import type { DomainAccessKeyRecord } from "@keeper/shared"

export interface RealmCastAccessActionsProps {
  domainId: string | null
  onInvite?: () => void
  onManageAccess?: () => void
}

async function fetchAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const data = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
  )) as { keys?: DomainAccessKeyRecord[] }
  return data.keys ?? []
}

export function RealmCastAccessActions({
  domainId,
  onInvite,
  onManageAccess,
}: RealmCastAccessActionsProps) {
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
      await fetchAccessKeys(domainId)
    } catch {
      onManageAccess?.()
    }
  }, [domainId, onManageAccess])

  return (
    <>
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
    </>
  )
}

/** @deprecated Use RealmCastAccessActions — agent chips moved to BoardInstrumentsBar. */
export const DialogCastBar = RealmCastAccessActions
