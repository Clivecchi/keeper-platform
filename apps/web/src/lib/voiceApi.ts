/**
 * Voice Preferences API client
 *
 * Fetches and updates user tone preferences (directness, conciseness, preamble)
 * for the Agent Posture / Voice stack.
 */

import { apiFetch } from "./api"

export interface VoicePreferences {
  directness: "direct" | "diplomatic" | "default"
  conciseness: "concise" | "normal" | "expanded"
  preamble: "minimal" | "normal" | "contextual"
}

export async function getVoicePreferences(): Promise<VoicePreferences | null> {
  const res = await apiFetch("/api/users/me/voice-preferences")
  if (res?.error) return null
  return res as VoicePreferences
}

export async function updateVoicePreferences(
  payload: Partial<VoicePreferences>
): Promise<VoicePreferences | null> {
  const res = await apiFetch("/api/users/me/voice-preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
  if (res?.error) return null
  return res as VoicePreferences
}

/**
 * Map voice preferences to a display label for the banner
 */
export function voicePreferencesToLabel(prefs: VoicePreferences | null): string {
  if (!prefs) return "Default"
  const parts: string[] = []
  if (prefs.directness && prefs.directness !== "default") {
    parts.push(prefs.directness.charAt(0).toUpperCase() + prefs.directness.slice(1))
  }
  if (prefs.conciseness && prefs.conciseness !== "normal") {
    parts.push(prefs.conciseness.charAt(0).toUpperCase() + prefs.conciseness.slice(1))
  }
  if (parts.length === 0) return "Default"
  return parts.join(" + ")
}
