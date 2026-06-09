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
