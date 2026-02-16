/**
 * Emotif API client
 *
 * Fetches and mutates emotif reactions on moments.
 */

import { apiFetch } from "./api"

export interface EmotifItem {
  id: string
  symbol: string
  label: string
  slot?: number
}

export interface DomainEmotifsResponse {
  platform: EmotifItem[]
  domain: EmotifItem[]
}

export interface MomentEmotifReaction {
  id: string
  emotifId: string
  emotifType: string
  userId: string
  createdAt: string
}

export async function getDomainEmotifs(domainId: string): Promise<DomainEmotifsResponse | null> {
  const res = await apiFetch(`/api/domains/${domainId}/emotifs`)
  if (res?.error) return null
  return res as DomainEmotifsResponse
}

export async function getMomentEmotifs(momentId: string): Promise<MomentEmotifReaction[]> {
  const res = await apiFetch(`/api/moments/${momentId}/emotifs`)
  if (res?.error || !Array.isArray(res)) return []
  return res as MomentEmotifReaction[]
}

export async function addMomentEmotif(
  momentId: string,
  payload: { emotifId: string; emotifType: "platform" | "domain" | "user" }
): Promise<MomentEmotifReaction | null> {
  const res = await apiFetch(`/api/moments/${momentId}/emotifs`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  if (res?.error) return null
  return res as MomentEmotifReaction
}

export async function removeMomentEmotif(
  momentId: string,
  emotifId: string
): Promise<boolean> {
  const res = await apiFetch(`/api/moments/${momentId}/emotifs/${emotifId}`, {
    method: "DELETE",
  })
  return !res?.error
}
