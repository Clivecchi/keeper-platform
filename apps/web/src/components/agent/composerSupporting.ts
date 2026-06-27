import type { PendingAttachment } from "./AgentComposer"

/** Minimum size before paste becomes a supporting document instead of inline text. */
export const PASTE_CAPTURE_MIN_CHARS = 280
export const PASTE_CAPTURE_MIN_LINES = 5
export const PASTE_CAPTURE_MIN_LINES_CHARS = 120

export function shouldCapturePaste(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (trimmed.length >= PASTE_CAPTURE_MIN_CHARS) return true
  const lineCount = trimmed.split(/\r?\n/).length
  return lineCount >= PASTE_CAPTURE_MIN_LINES && trimmed.length >= PASTE_CAPTURE_MIN_LINES_CHARS
}

export function isPastedSupportingDoc(attachment: PendingAttachment): boolean {
  return attachment.source === "paste" && Boolean(attachment.pastedContent?.trim())
}

export function pastedPreview(text: string, maxLen = 140): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  if (collapsed.length <= maxLen) return collapsed
  return `${collapsed.slice(0, maxLen - 1)}…`
}

export function buildComposerSubmitContent(
  prompt: string,
  attachments: readonly PendingAttachment[],
): { content: string; displayContent: string } {
  const trimmedPrompt = prompt.trim()
  const pasted = attachments.filter(isPastedSupportingDoc)

  if (pasted.length === 0) {
    return { content: trimmedPrompt, displayContent: trimmedPrompt }
  }

  const blocks = pasted.map((doc, index) => {
    const body = doc.pastedContent!.trim()
    if (pasted.length === 1) return body
    return `[Supporting document ${index + 1}]\n${body}`
  })

  const contextBlock = blocks.join("\n\n---\n\n")
  const content = trimmedPrompt
    ? `${trimmedPrompt}\n\n---\nSupporting context:\n\n${contextBlock}`
    : contextBlock

  const displayContent =
    trimmedPrompt ||
    (pasted.length === 1 ? "Pasted context attached" : `${pasted.length} pasted documents attached`)

  return { content, displayContent }
}
