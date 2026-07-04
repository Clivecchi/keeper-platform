import { apiFetch } from "../../lib/apiFetch"
import { DEFAULT_HOME_DISPLAY_NAME } from "../shell/shellMode"

const STORAGE_KEY = "keeper.homeDisplayName"

export type UserHomeSettings = {
  homeDisplayName: string
}

function readFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim()
    return stored || null
  } catch {
    return null
  }
}

function readHomeNameFromSettings(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const root = raw as Record<string, unknown>
  const keeper =
    root.keeper && typeof root.keeper === "object"
      ? (root.keeper as Record<string, unknown>)
      : null
  const fromKeeper =
    typeof keeper?.homeDisplayName === "string" ? keeper.homeDisplayName.trim() : ""
  if (fromKeeper) return fromKeeper
  const flat =
    typeof root.homeDisplayName === "string" ? root.homeDisplayName.trim() : ""
  return flat || null
}

/** Load the user's Home surface label (falls back to "Home"). */
export async function fetchUserHomeDisplayName(): Promise<string> {
  const fromStorage = readFromStorage()
  if (fromStorage) return fromStorage

  try {
    const res = (await apiFetch("/api/kam/settings")) as {
      success?: boolean
      data?: unknown
      settings?: unknown
      user?: { settings?: unknown }
    }
    const raw = res?.data ?? res?.settings ?? res?.user?.settings
    return readHomeNameFromSettings(raw) ?? DEFAULT_HOME_DISPLAY_NAME
  } catch {
    return DEFAULT_HOME_DISPLAY_NAME
  }
}

/** Persist Home label locally until user.settings API lands. */
export async function saveUserHomeDisplayName(name: string): Promise<string> {
  const trimmed = name.trim() || DEFAULT_HOME_DISPLAY_NAME
  try {
    localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    /* ignore */
  }
  return trimmed
}

export { DEFAULT_HOME_DISPLAY_NAME as DEFAULT_HOME_NAME }
