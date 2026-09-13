export const DOMAIN_CONFIG_FRAMES = [
  "identity",
  "people",
  "addresses",
  "presence",
  "build",
] as const

export type DomainConfigFrame = (typeof DOMAIN_CONFIG_FRAMES)[number]

export interface DomainConfigFrameDef {
  id: DomainConfigFrame
  label: string
  hint: string
}

export const DOMAIN_CONFIG_FRAME_DEFS: readonly DomainConfigFrameDef[] = [
  { id: "identity", label: "Domain", hint: "Name, cover, and who leads." },
  { id: "people", label: "People", hint: "Owner, members, and invitations." },
  { id: "addresses", label: "Addresses", hint: "Where this Domain lives." },
  { id: "presence", label: "Presence", hint: "How this Domain shows up and feels." },
  { id: "build", label: "Build", hint: "Repository and environment for this Domain." },
]

export function isDomainConfigFrame(value: string): value is DomainConfigFrame {
  return (DOMAIN_CONFIG_FRAMES as readonly string[]).includes(value)
}

export function resolveDomainConfigFrame(
  value: string | null | undefined,
  options: { includeBuild?: boolean } = {},
): DomainConfigFrame {
  if (value === "people") return "people"
  if (value === "addresses") return "addresses"
  if (value === "presence") return "presence"
  if (value === "build" && options.includeBuild) return "build"
  return "identity"
}
