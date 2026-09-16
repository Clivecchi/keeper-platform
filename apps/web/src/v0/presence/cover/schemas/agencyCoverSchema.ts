/**
 * Agency Place cover — Board Cover of the Domain record.
 * Not a new EntityKind. Not Domain Cover. Not Kip.
 */

import type { CoverActionDef, ResolvedCoverContent } from "../coverTypes"
import { heroImageFromRecord, resolveCoverAvatarDisplay } from "../coverImageUtils"
import { agencyEntrustedLine, agencyPlaceTraits, type AgencyPlaceFacts } from "../agencyPlace"

export function resolveAgencyCoverContent(
  record: Record<string, unknown>,
  fieldValues: Record<string, string>,
  facts: AgencyPlaceFacts | null,
  handlers: {
    onPeople: () => void
    onAgents: () => void
  },
): ResolvedCoverContent {
  const name =
    facts?.domainName.trim() ||
    (typeof fieldValues.name === "string" && fieldValues.name.trim()) ||
    (typeof record.name === "string" && record.name.trim()) ||
    (typeof record.display_label === "string" && record.display_label.trim()) ||
    "Untitled domain"

  const coverUrl = heroImageFromRecord(record).url ?? undefined
  const accent =
    (typeof fieldValues.theme_color === "string" && fieldValues.theme_color.trim()) ||
    (typeof record.theme_color === "string" && record.theme_color.trim()) ||
    ""

  const peopleAction: CoverActionDef = {
    id: "people",
    label: "People",
    variant: "primary",
    onClick: handlers.onPeople,
  }
  const agentsAction: CoverActionDef = {
    id: "agents",
    label: "Agents",
    variant: "secondary",
    onClick: handlers.onAgents,
  }

  return {
    hero: {
      avatar: resolveCoverAvatarDisplay(coverUrl, name.slice(0, 1).toUpperCase()),
      accentColor: accent,
      avatarGlow: "active",
      chromeTitle: "Agency",
      roleLabel: "AGENCY",
    },
    identity: {
      name,
      roleLine: facts ? agencyEntrustedLine(facts) : undefined,
      voiceQuote:
        "The people and agents entrusted to act in this Domain's interests.",
    },
    traits: facts ? agencyPlaceTraits(facts) : [],
    credits: [],
    actions: [peopleAction, agentsAction],
  }
}
