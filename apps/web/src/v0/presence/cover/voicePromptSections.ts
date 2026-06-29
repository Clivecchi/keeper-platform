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
  /** Film strip chip label */
  stripLabel: string
  /** One-line frame intent shown in storyboard stage chrome */
  frameIntent: string
  placeholder: string
}

export const VOICE_PROMPT_SECTIONS: VoicePromptSectionDef[] = [
  {
    key: "currently",
    delimiter: "## Currently",
    label: "Currently",
    stripLabel: "Currently",
    frameIntent: "What's live and what's next — open every training session here.",
    placeholder: "No Currently content yet. Edit to add.",
  },
  {
    key: "identity",
    delimiter: "## 1. Identity",
    label: "1. Identity",
    stripLabel: "Identity",
    frameIntent: "Voice and character — who this agent is when they speak.",
    placeholder: "No Identity content yet. Edit to add.",
  },
  {
    key: "behavior",
    delimiter: "## 2. Behavior",
    label: "2. Behavior",
    stripLabel: "Behavior",
    frameIntent: "Rules and habits — how the agent acts in conversation.",
    placeholder: "No Behavior content yet. Edit to add.",
  },
  {
    key: "capabilities",
    delimiter: "## 3. Capabilities",
    label: "3. Capabilities",
    stripLabel: "Capabilities",
    frameIntent: "What this agent can do — declared skills and limits.",
    placeholder: "No Capabilities content yet. Edit to add.",
  },
  {
    key: "governance",
    delimiter: "## 4. Governance",
    label: "4. Governance",
    stripLabel: "Governance",
    frameIntent: "Boundaries, escalation, and what stays off-limits.",
    placeholder: "No Governance content yet. Edit to add.",
  },
]

export function voicePromptSectionDef(
  key: VoicePromptSectionKey,
): VoicePromptSectionDef {
  const def = VOICE_PROMPT_SECTIONS.find((section) => section.key === key)
  if (!def) throw new Error(`Unknown voice prompt section: ${key}`)
  return def
}

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

export function parseIdentitySection(content: string): IdentitySectionFields {
  const trimmed = content.trim()
  if (!trimmed) return { voice: "", character: "" }

  const byDouble = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (byDouble.length >= 2) {
    return {
      voice: byDouble[0] ?? "",
      character: byDouble.slice(1).join("\n\n"),
    }
  }

  const block = byDouble[0] ?? trimmed
  const newlineIndex = block.indexOf("\n")
  if (newlineIndex === -1) {
    return { voice: block, character: "" }
  }

  return {
    voice: block.slice(0, newlineIndex).trim(),
    character: block.slice(newlineIndex + 1).trim(),
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

export function parseRuleLines(content: string): string[] {
  const trimmed = content.trim()
  if (!trimmed) return []
  return trimmed.split(/\n+/).map((r) => r.trim()).filter(Boolean)
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

export function parseCapabilityLines(content: string): CapabilityItem[] {
  const trimmed = content.trim()
  if (!trimmed) return []
  return trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseCapabilityLine)
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
