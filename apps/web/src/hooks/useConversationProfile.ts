import { useCallback, useEffect, useState } from "react"
import {
  CONVERSATION_PROFILE_LABELS,
  DEFAULT_CONVERSATION_PROFILE,
  parseConversationProfile,
  type ConversationProfile,
} from "@keeper/shared"

const STORAGE_KEY = "keeper.conversationProfile"
const CHANGE_EVENT = "keeper:conversation-profile"

function readStoredProfile(): ConversationProfile {
  if (typeof window === "undefined") return DEFAULT_CONVERSATION_PROFILE
  try {
    return parseConversationProfile(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_CONVERSATION_PROFILE
  }
}

function writeStoredProfile(profile: ConversationProfile): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, profile)
  } catch {
    /* private mode / quota — memory still updates via the event */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: profile }))
}

/**
 * Composer Conversation Profile — which standing-instruction stack this turn uses.
 * Browser-local. Does not write Dialog, Document, Domain, or Dialog Style / Cueing.
 */
export function useConversationProfile(): {
  conversationProfile: ConversationProfile
  conversationProfileLabel: string
  setConversationProfile: (profile: ConversationProfile) => void
  cycleConversationProfile: () => void
} {
  const [conversationProfile, setProfile] = useState<ConversationProfile>(readStoredProfile)

  useEffect(() => {
    const sync = () => setProfile(readStoredProfile())
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail
      setProfile(parseConversationProfile(detail))
    }
    window.addEventListener("storage", sync)
    window.addEventListener(CHANGE_EVENT, onCustom)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(CHANGE_EVENT, onCustom)
    }
  }, [])

  const setConversationProfile = useCallback((profile: ConversationProfile) => {
    setProfile(profile)
    writeStoredProfile(profile)
  }, [])

  const cycleConversationProfile = useCallback(() => {
    setConversationProfile(conversationProfile === "current" ? "conversation" : "current")
  }, [conversationProfile, setConversationProfile])

  return {
    conversationProfile,
    conversationProfileLabel: CONVERSATION_PROFILE_LABELS[conversationProfile],
    setConversationProfile,
    cycleConversationProfile,
  }
}
