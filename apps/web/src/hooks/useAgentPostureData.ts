/**
 * useAgentPostureData
 *
 * Fetches and aggregates data for the AgentPostureHeader banner:
 * agent name, domain, lens, dialogue mode, governance, voice.
 *
 * Used by AgentBoardFrame and KipAgentBoardPage.
 */

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "../lib/api"
import { KipApi, type AgentModeState } from "../lib/kipApi"
import { getDomainGovernance } from "../lib/governanceApi"
import {
  getVoicePreferences,
  voicePreferencesToLabel,
  type VoicePreferences,
} from "../lib/voiceApi"

export interface AgentPostureData {
  agentName: string
  domainName: string | null
  lensName: string
  dialogueMode: "domain" | "debug"
  governanceMode: "strict" | "warn" | "off"
  voiceLabel: string
  isLive: boolean
  isLoading: boolean
  error: string | null
}

interface ModeConfigResponse extends AgentModeState {
  resolvedLens?: { id: string; name: string } | null
}

export function useAgentPostureData(args: {
  agentId: string | null
  agentName?: string | null
  domainId: string | null
  domainName?: string | null
  domainSlug?: string | null
  isAuthenticated?: boolean
}): AgentPostureData {
  const {
    agentId,
    agentName: agentNameProp,
    domainId,
    domainName: domainNameProp,
    isAuthenticated = false,
  } = args

  const [modeState, setModeState] = useState<ModeConfigResponse | null>(null)
  const [governanceMode, setGovernanceMode] = useState<"strict" | "warn" | "off">("warn")
  const [domainName, setDomainName] = useState<string | null>(domainNameProp ?? null)
  const [voicePrefs, setVoicePrefs] = useState<VoicePreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!agentId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const domainKey = domainId || undefined

      const modeRes = (await KipApi.getModeConfig(agentId, domainKey).catch(
        () => null
      )) as ModeConfigResponse | null
      setModeState(modeRes)

      if (domainId) {
        const gov = await getDomainGovernance(domainId).catch(() => null)
        if (gov?.enforcementMode) {
          setGovernanceMode(gov.enforcementMode)
        }
      }

      if (!domainNameProp && domainId) {
        try {
          const domainRes = (await apiFetch(
            `/api/domains/${domainId}`
          )) as { name?: string; data?: { name?: string } }
          const name = domainRes?.name ?? domainRes?.data?.name ?? null
          if (name) setDomainName(name)
        } catch {
          // ignore
        }
      } else if (domainNameProp) {
        setDomainName(domainNameProp)
      }

      if (isAuthenticated) {
        try {
          const prefs = await getVoicePreferences()
          if (prefs) setVoicePrefs(prefs)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posture data")
    } finally {
      setIsLoading(false)
    }
  }, [agentId, domainId, domainNameProp, isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lensName =
    modeState?.resolvedLens?.name ??
    (modeState?.activeMode === "debug"
      ? "Debug Investigator Lens"
      : "Domain Lens")
  const dialogueMode = modeState?.activeMode ?? "domain"

  return {
    agentName: agentNameProp ?? "Agent",
    domainName: domainName ?? domainNameProp ?? null,
    lensName,
    dialogueMode,
    governanceMode,
    voiceLabel: isAuthenticated ? voicePreferencesToLabel(voicePrefs) : "Default",
    isLive: true,
    isLoading,
    error,
  }
}
