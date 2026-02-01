"use client"

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import { PresentationBoardRenderer } from "../../../worlds/shared/BoardRenderer"

export function PresentFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug } = useV0Shell()

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Present"
      subtitle="A story-first presentation surface for this domain."
      themeSwitcherSlot={<ThemeSwitcher />}
    >
      <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
        <PresentationBoardRenderer domainSlug={domainSlug} />
      </div>
    </DesignFrame>
  )
}
