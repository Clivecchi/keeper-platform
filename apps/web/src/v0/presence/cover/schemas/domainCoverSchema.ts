import type {
  CoverActionDef,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

function resolveAccent(themeColor?: string): string {
  if (!themeColor?.trim()) return ""
  return themeColor.trim()
}

export const domainCoverSchema: EntityCoverSchema = {
  objectType: "domain",
  resolve(
    record,
    fieldValues,
    _ctx,
    actions,
  ): ResolvedCoverContent {
    const name =
      (typeof fieldValues.name === "string" && fieldValues.name.trim()) ||
      (typeof record.name === "string" && record.name.trim()) ||
      "Untitled domain"

    const tagline =
      (typeof fieldValues.tagline === "string" && fieldValues.tagline.trim()) ||
      (typeof record.tagline === "string" && record.tagline.trim()) ||
      ""

    const purpose =
      (typeof fieldValues.purpose === "string" && fieldValues.purpose.trim()) ||
      (typeof record.purpose === "string" && record.purpose.trim()) ||
      (typeof record.description === "string" && record.description.trim()) ||
      ""

    const themeColor =
      (typeof fieldValues.theme_color === "string" && fieldValues.theme_color) ||
      (typeof record.theme_color === "string" && record.theme_color) ||
      ""

    const accent = resolveAccent(themeColor)
    const status =
      (typeof fieldValues.status === "string" && fieldValues.status) ||
      (typeof record.status === "string" && record.status) ||
      "active"

    const configureAction: CoverActionDef = {
      id: "configure",
      label: "Configure",
      variant: "secondary",
      icon: "gear",
      onClick: actions.onConfigure,
    }

    return {
      hero: {
        avatar: name.slice(0, 1).toUpperCase(),
        accentColor: accent,
        statusLabel: status,
        avatarGlow: "active",
        chromeTitle: "Domain",
      },
      identity: {
        name,
        roleLine: tagline || undefined,
        voiceQuote: purpose || undefined,
        voicePlaceholder: "What is this domain for?",
      },
      traits: [
        ...(fieldValues.keeperType?.trim()
          ? [{ label: "Character", value: fieldValues.keeperType }]
          : []),
        ...(fieldValues.visibility?.trim()
          ? [{ label: "Visibility", value: fieldValues.visibility }]
          : []),
      ],
      credits: [],
      actions: [configureAction],
    }
  },
}
