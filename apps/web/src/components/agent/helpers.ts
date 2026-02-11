/**
 * Shared helpers for agent components.
 * Extracted from KipAgentBoardPage for reuse across legacy and new Agent Board.
 */

export const formatDate = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export const formatTime = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export const formatRelative = (value: string): string => {
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export const shortId = (id: string): string => id.slice(0, 6).toUpperCase()
