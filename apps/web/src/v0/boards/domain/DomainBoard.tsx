"use client"

/**
 * DomainBoard — Moment 2.7
 *
 * The def is the board. No overrides.
 *
 * Left:   UniversalNavPanel reading DOMAIN_BOARD_DEF.nav (Keeper, Dialogs, Journeys, Boards)
 * Center: UniversalConversation (domain mode)
 * Right:  Chronicle reading DOMAIN_BOARD_DEF.contextSurface
 *
 * DomainSwitcher is a fixed overlay triggered by the top bar — not a panel.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useV0Shell } from "../../shell/V0ShellContext"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { UniversalBoard } from "../UniversalBoard"
import { DOMAIN_BOARD_DEF } from "../UniversalBoardDefinition"

const MOCK_DOMAINS = [
  { slug: "default", name: "KE3P", tagline: "cynically designed, wonderfully unfolded", coverImageUrl: null },
  { slug: "frogmore", name: "Frogmore Juke Joint", tagline: "housefrogmore.com", coverImageUrl: null },
]

export function DomainBoard() {
  const { domainSlug: slug } = useV0Shell()
  const navigate = useNavigate()
  const [switcherOpen, setSwitcherOpen] = React.useState(false)

  return (
    <>
      <UniversalBoard
        def={DOMAIN_BOARD_DEF}
        onDomainClick={() => setSwitcherOpen(true)}
      />
      {switcherOpen && (
        <DomainSwitcher
          domains={MOCK_DOMAINS}
          currentSlug={slug || "default"}
          onSelect={(s) => navigate(`/d/${encodeURIComponent(s)}/board`)}
          onAddDomain={() => console.log("Add domain")}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
    </>
  )
}
