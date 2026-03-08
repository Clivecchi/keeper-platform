"use client"

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import { DomainAdminContent } from "./DomainAdminContent"
import { defaultDomainAdminFrame } from "../../data/domain-frame.default"

const ADMIN_SURFACE = {
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
}

export function AdminFrame({ styleId = "neutral", themeSlug, domainSlug }: { styleId?: StyleId; themeSlug?: string | null; domainSlug?: string }) {
  const { closeToBoard, domainSlug: ctxSlug, domainFrame } = useV0Shell()
  const adminLabels = domainFrame?.domain_admin ?? defaultDomainAdminFrame
  const slug = domainSlug ?? ctxSlug ?? ""

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={adminLabels.labels.frameTitle}
      subtitle={slug ? `Manage ${slug}` : adminLabels.labels.frameSubtitle}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label={adminLabels.labels.backToCommons}
          onClick={closeToBoard}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80"
          style={{ borderColor: ADMIN_SURFACE.border, color: ADMIN_SURFACE.inkPrimary }}
        >
          {adminLabels.labels.backToCommons}
        </button>
      }
      onClose={closeToBoard}
    >
      {slug ? <DomainAdminContent domainSlug={slug} adminLabels={adminLabels} /> : (
        <div className="rounded-2xl border px-6 py-6 shadow-sm" style={{ borderColor: ADMIN_SURFACE.border }}>
          <p className="text-sm" style={{ color: ADMIN_SURFACE.inkPrimary }}>{adminLabels.labels.noDomainSelected}</p>
        </div>
      )}
    </DesignFrame>
  )
}
