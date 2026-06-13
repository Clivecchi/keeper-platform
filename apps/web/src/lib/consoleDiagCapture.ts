/**
 * consoleDiagCapture
 *
 * Intercepts browser console output for the Dialog Thinking Space Diag stream.
 * Original console methods are preserved — logs still reach DevTools.
 */

export type ConsoleDiagLevel = "log" | "warn" | "error" | "info" | "debug"

export interface ConsoleDiagEntry {
  id: string
  level: ConsoleDiagLevel
  message: string
  timestamp: number
}

const MAX_ENTRIES = 200
const LEVELS: ConsoleDiagLevel[] = ["log", "warn", "error", "info", "debug"]

let entries: ConsoleDiagEntry[] = []
let nextId = 0
let installed = false
const listeners = new Set<() => void>()

function formatArg(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Error) return value.stack ?? value.message
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatArgs(args: unknown[]): string {
  return args.map(formatArg).join(" ")
}

function pushEntry(level: ConsoleDiagLevel, args: unknown[]): void {
  const message = formatArgs(args)
  entries = [
    ...entries.slice(-(MAX_ENTRIES - 1)),
    {
      id: `diag-${nextId++}`,
      level,
      message,
      timestamp: Date.now(),
    },
  ]
  listeners.forEach((listener) => listener())
}

export function installConsoleDiagCapture(): void {
  if (installed || typeof window === "undefined") return
  installed = true

  for (const level of LEVELS) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      pushEntry(level, args)
      original(...args)
    }
  }
}

export function subscribeConsoleDiag(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getConsoleDiagEntries(): readonly ConsoleDiagEntry[] {
  return entries
}

export function clearConsoleDiagEntries(): void {
  entries = []
  listeners.forEach((listener) => listener())
}

export function formatConsoleDiagForCopy(source: readonly ConsoleDiagEntry[]): string {
  return source
    .map((entry) => {
      const time = new Date(entry.timestamp).toISOString()
      return `[${time}] ${entry.level.toUpperCase()}: ${entry.message}`
    })
    .join("\n")
}

export async function copyConsoleDiagToClipboard(
  source: readonly ConsoleDiagEntry[] = entries,
): Promise<void> {
  await navigator.clipboard.writeText(formatConsoleDiagForCopy(source))
}

/** Parsed UniversalNavPanel board-definition snapshot from a captured log line. */
export interface NavPanelBoardDefSnapshot {
  definitionParam: string | null
  activeBoardDefId: string | null
  timestamp: number
}

const NAV_PANEL_PREFIX = "[UniversalNavPanel]"

export function parseNavPanelBoardDefEntry(
  entry: ConsoleDiagEntry,
): NavPanelBoardDefSnapshot | null {
  if (!entry.message.includes(NAV_PANEL_PREFIX)) return null

  const jsonStart = entry.message.indexOf("{")
  if (jsonStart === -1) return null

  try {
    const payload = JSON.parse(entry.message.slice(jsonStart)) as {
      definition?: string | null
      activeBoardDefId?: string | null
    }
    return {
      definitionParam: payload.definition ?? null,
      activeBoardDefId: payload.activeBoardDefId ?? null,
      timestamp: entry.timestamp,
    }
  } catch {
    return null
  }
}

export function getLatestNavPanelBoardDefSnapshot(
  source: readonly ConsoleDiagEntry[],
): NavPanelBoardDefSnapshot | null {
  for (let i = source.length - 1; i >= 0; i -= 1) {
    const snapshot = parseNavPanelBoardDefEntry(source[i]!)
    if (snapshot) return snapshot
  }
  return null
}
