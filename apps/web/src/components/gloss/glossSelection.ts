/**
 * Read a non-empty text selection that lies inside a Gloss surface element.
 * Used so phrase-level Gloss targets the selected words, not the whole node.
 */

export function readSelectionWithin(container: HTMLElement | null): string | null {
  if (!container || typeof window === "undefined") return null
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null

  const text = selection.toString().replace(/\s+/g, " ").trim()
  if (!text) return null

  const anchorNode = selection.anchorNode
  const focusNode = selection.focusNode
  const anchorInside = Boolean(anchorNode && container.contains(anchorNode))
  const focusInside = Boolean(focusNode && container.contains(focusNode))
  if (!anchorInside && !focusInside) return null

  // Prefer selections fully inside the surface; still accept if either end is inside
  // (user may drag slightly past the bubble edge).
  return text
}
