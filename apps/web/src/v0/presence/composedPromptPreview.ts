/**
 * Parse runtime composed system prompt into human-readable sections.
 * Never split on single newlines — that breaks JSON and platform rules into nonsense "points".
 */

export type ComposedSectionKind =
  | "identity"
  | "domain-lens"
  | "technical"
  | "rules"
  | "contract"

export interface ComposedPromptSection {
  id: string
  title: string
  body: string
  kind: ComposedSectionKind
  defaultOpen: boolean
}

function sectionId(title: string, index: number): string {
  return `${title.replace(/\W+/g, "-").toLowerCase()}-${index}`
}

function isJsonBlock(text: string): boolean {
  const t = text.trim()
  return (
    (t.startsWith("{") && t.includes("}"))
    || t.startsWith('"version"')
    || /^[\s\n]*\{[\s\n]*"version"/.test(t)
  )
}

function classifyBlock(block: string): Pick<ComposedPromptSection, "title" | "kind" | "defaultOpen"> {
  const head = block.slice(0, 120)
  if (block.startsWith("Environment context") || isJsonBlock(block)) {
    return { title: "Platform environment", kind: "technical", defaultOpen: false }
  }
  if (block.startsWith("DOMAIN CONTRACT")) {
    return { title: "Domain contract", kind: "contract", defaultOpen: false }
  }
  if (
    head.includes("Structured response required")
    || block.startsWith("Allowed actions")
    || block.startsWith("DRAFT BEHAVIOR")
    || block.startsWith("SOLE vs DRAFTS")
  ) {
    return { title: "Actions & drafts", kind: "rules", defaultOpen: false }
  }
  if (block.startsWith("RESPONSE RENDERING") || block.startsWith("TOOLS —")) {
    return { title: "Response & tools", kind: "rules", defaultOpen: false }
  }
  if (block.includes("sole.read") || block.startsWith("SOLE MEMORY")) {
    return { title: "Memory & retrieval", kind: "rules", defaultOpen: false }
  }
  if (block.startsWith("IMAGE GENERATION")) {
    return { title: "Image generation", kind: "rules", defaultOpen: false }
  }
  return { title: "Identity & mode", kind: "identity", defaultOpen: true }
}

function splitIdentityBlock(block: string): ComposedPromptSection[] {
  const match = block.match(/\n(?=You are )/)
  if (!match || match.index === undefined || match.index === 0) {
    const meta = classifyBlock(block)
    return [{ id: sectionId(meta.title, 0), ...meta, body: block }]
  }
  const lensPart = block.slice(0, match.index).trim()
  const identityPart = block.slice(match.index).trim()
  const out: ComposedPromptSection[] = []
  if (lensPart) {
    out.push({
      id: sectionId("domain-lens", 0),
      title: "Domain lens (shared)",
      body: lensPart,
      kind: "domain-lens",
      defaultOpen: false,
    })
  }
  if (identityPart) {
    out.push({
      id: sectionId("identity", 1),
      title: "Identity & mode",
      body: identityPart,
      kind: "identity",
      defaultOpen: true,
    })
  }
  return out
}

/** Split composed prompt text into labeled sections for Chronicle preview. */
export function parseComposedPromptSections(text: string): ComposedPromptSection[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const blocks = trimmed.split(/\n\n+/).map((b) => b.trim()).filter(Boolean)
  const sections: ComposedPromptSection[] = []

  blocks.forEach((block, index) => {
    const meta = classifyBlock(block)
    if (meta.kind === "identity" && index === 0 && !block.startsWith("You are ")) {
      sections.push(...splitIdentityBlock(block))
      return
    }
    sections.push({
      id: sectionId(meta.title, index),
      ...meta,
      body: block,
    })
  })

  return sections
}
