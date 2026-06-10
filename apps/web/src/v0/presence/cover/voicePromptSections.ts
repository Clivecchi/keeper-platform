/**
 * Training Mode — parse / serialize config.voice_prompt by section delimiters.
 */

export type VoicePromptSectionKey =
  | "currently"
  | "identity"
  | "behavior"
  | "capabilities"
  | "governance"

export interface VoicePromptSectionDef {
  key: VoicePromptSectionKey
  /** Markdown delimiter written to voice_prompt */
  delimiter: string
  /** Chronicle Training Mode header label */
  label: string
  placeholder: string
}

export const VOICE_PROMPT_SECTIONS: VoicePromptSectionDef[] = [
  {
    key: "currently",
    delimiter: "## Currently",
    label: "Currently",
    placeholder: "No Currently content yet. Edit to add.",
  },
  {
    key: "identity",
    delimiter: "## 1. Identity",
    label: "1. Identity",
    placeholder: "No Identity content yet. Edit to add.",
  },
  {
    key: "behavior",
    delimiter: "## 2. Behavior",
    label: "2. Behavior",
    placeholder: "No Behavior content yet. Edit to add.",
  },
  {
    key: "capabilities",
    delimiter: "## 3. Capabilities",
    label: "3. Capabilities",
    placeholder: "No Capabilities content yet. Edit to add.",
  },
  {
    key: "governance",
    delimiter: "## 4. Governance",
    label: "4. Governance",
    placeholder: "No Governance content yet. Edit to add.",
  },
]

const DELIMITER_PATTERN =
  /^## (?:Currently|1\. Identity|2\. Behavior|3\. Capabilities|4\. Governance)\s*$/m

export type VoicePromptSections = Record<VoicePromptSectionKey, string>

export function emptyVoicePromptSections(): VoicePromptSections {
  return {
    currently: "",
    identity: "",
    behavior: "",
    capabilities: "",
    governance: "",
  }
}

export function parseVoicePromptSections(raw: string | undefined | null): VoicePromptSections {
  const sections = emptyVoicePromptSections()
  const text = raw?.trim() ?? ""
  if (!text) return sections

  if (!DELIMITER_PATTERN.test(text)) {
    sections.currently = text
    return sections
  }

  const parts = text.split(DELIMITER_PATTERN)
  const headers = text.match(new RegExp(DELIMITER_PATTERN.source, "gm")) ?? []

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim()
    const body = (parts[i + 1] ?? "").trim()
    const def = VOICE_PROMPT_SECTIONS.find((s) => s.delimiter === header)
    if (def) sections[def.key] = body
  }

  return sections
}

export function serializeVoicePromptSections(sections: VoicePromptSections): string {
  return VOICE_PROMPT_SECTIONS.map((def) => {
    const body = sections[def.key]?.trim() ?? ""
    return body ? `${def.delimiter}\n${body}` : `${def.delimiter}\n`
  }).join("\n\n")
}

export function patchVoicePromptSection(
  raw: string | undefined | null,
  key: VoicePromptSectionKey,
  content: string,
): string {
  const sections = parseVoicePromptSections(raw)
  sections[key] = content.trim()
  return serializeVoicePromptSections(sections).trim()
}

export interface IdentitySectionFields {
  voice: string
  character: string
}

export interface CapabilityItem {
  name: string
  description: string
}

function sectionLooksCorrupt(content: string): boolean {
  return /^##\s/m.test(content.trim())
}

export function parseIdentitySection(content: string): {
  fields: IdentitySectionFields
  fallback: boolean
} {
  const trimmed = content.trim()
  if (!trimmed) return { fields: { voice: "", character: "" }, fallback: false }
  if (sectionLooksCorrupt(trimmed)) return { fields: { voice: "", character: "" }, fallback: true }

  const parts = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length > 2) return { fields: { voice: "", character: "" }, fallback: true }

  return {
    fields: { voice: parts[0] ?? "", character: parts[1] ?? "" },
    fallback: false,
  }
}

export function serializeIdentitySection(fields: IdentitySectionFields): string {
  const voice = fields.voice.trim()
  const character = fields.character.trim()
  if (!voice && !character) return ""
  if (!character) return voice
  if (!voice) return character
  return `${voice}\n\n${character}`
}

export function parseRuleLines(content: string): { rules: string[]; fallback: boolean } {
  const trimmed = content.trim()
  if (!trimmed) return { rules: [], fallback: false }
  if (sectionLooksCorrupt(trimmed)) return { rules: [], fallback: true }

  const byNewline = trimmed.split(/\n+/).map((r) => r.trim()).filter(Boolean)
  if (byNewline.length > 1) return { rules: byNewline, fallback: false }

  const byParagraph = trimmed.split(/\n\n+/).map((r) => r.trim()).filter(Boolean)
  return { rules: byParagraph, fallback: false }
}

export function serializeRuleLines(rules: string[]): string {
  return rules.map((r) => r.trim()).filter(Boolean).join("\n")
}

function parseCapabilityLine(line: string): CapabilityItem {
  const boldMatch = line.match(/^\*\*(.+?)\*\*\s*(?:[—–:-]\s*)?(.*)$/)
  if (boldMatch) {
    return { name: boldMatch[1].trim(), description: boldMatch[2].trim() }
  }
  const separatorMatch = line.match(/^([^:—–]+)[—–:]\s*(.+)$/)
  if (separatorMatch) {
    return { name: separatorMatch[1].trim(), description: separatorMatch[2].trim() }
  }
  return { name: line.trim(), description: "" }
}

export function parseCapabilityLines(content: string): {
  capabilities: CapabilityItem[]
  fallback: boolean
} {
  const trimmed = content.trim()
  if (!trimmed) return { capabilities: [], fallback: false }
  if (sectionLooksCorrupt(trimmed)) return { capabilities: [], fallback: true }

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  return { capabilities: lines.map(parseCapabilityLine), fallback: false }
}

export function serializeCapabilityLines(capabilities: CapabilityItem[]): string {
  return capabilities
    .filter((c) => c.name.trim())
    .map((c) => {
      const name = c.name.trim()
      const desc = c.description.trim()
      return desc ? `**${name}** — ${desc}` : name
    })
    .join("\n")
}
