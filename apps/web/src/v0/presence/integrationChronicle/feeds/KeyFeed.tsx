"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"
import { KipApi } from "../../../../lib/kipApi"
import type { LinkedAgent } from "./AIModelFeed"

export type KeyDto = {
  id: string
  provider: string
  key_source: string
  status: string
  scope: string | null
  last_verified: string | null
  expires_at: string | null
  domain_id: string
  user_id: string | null
  integration_id: string | null
  chronicle_blocks: string[]
  chronicle_actions: string[]
  display_label: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type KeyFeedData = {
  key: KeyDto
  linkedAgents: LinkedAgent[]
  integrationCapabilities: string[]
  verifyBusy: boolean
  rotateBusy: boolean
  keySaveError: string | null
  verify: () => Promise<void>
  saveCredential: (apiKey: string) => Promise<void>
  rotate: (apiKey: string) => Promise<void>
  revoke: () => Promise<void>
  reload: () => Promise<void>
}

export function useKeyFeedData(keyId: string, domainId: string): {
  data: KeyFeedData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
} {
  const [key, setKey] = React.useState<KeyDto | null>(null)
  const [linkedAgents, setLinkedAgents] = React.useState<LinkedAgent[]>([])
  const [integrationCapabilities, setIntegrationCapabilities] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [verifyBusy, setVerifyBusy] = React.useState(false)
  const [rotateBusy, setRotateBusy] = React.useState(false)
  const [keySaveError, setKeySaveError] = React.useState<string | null>(null)

  const loadAgents = React.useCallback(async (provider: string) => {
    try {
      const agents = await KipApi.getAllAgents()
      setLinkedAgents(
        agents
          .filter((agent) => agent.model_provider === provider)
          .map((agent) => ({
            id: agent.id,
            name: agent.name,
            model: agent.model_settings?.model || agent.model || "—",
          })),
      )
    } catch {
      setLinkedAgents([])
    }
  }, [])

  const loadIntegration = React.useCallback(async (provider: string) => {
    try {
      const rows = (await apiFetch("/api/integrations")) as Array<{
        service: string
        metadata?: Record<string, unknown> | null
      }>
      const match = rows.find((r) => r.service === provider)
      const catalog = match?.metadata as { catalog?: { items?: Array<{ id?: string }> } } | undefined
      const caps: string[] = []
      if (catalog?.catalog?.items?.length) {
        caps.push(`${catalog.catalog.items.length} models`)
      }
      if (provider === "together-ai") caps.push("Image generation", "JSON mode")
      if (provider === "elevenlabs") caps.push("Voice synthesis")
      if (provider === "anthropic" || provider === "openai") caps.push("Agent chat")
      setIntegrationCapabilities(caps)
    } catch {
      setIntegrationCapabilities([])
    }
  }, [])

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const row = (await apiFetch(`/api/keys/${encodeURIComponent(keyId)}`)) as KeyDto
      setKey(row)
      await Promise.all([loadAgents(row.provider), loadIntegration(row.provider)])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load key")
      setKey(null)
    } finally {
      setLoading(false)
    }
  }, [keyId, loadAgents, loadIntegration])

  React.useEffect(() => {
    void reload()
  }, [reload, domainId])

  const verify = React.useCallback(async () => {
    if (!key) return
    setVerifyBusy(true)
    setKeySaveError(null)
    try {
      const result = (await apiFetch(`/api/keys/${encodeURIComponent(key.id)}/verify`, {
        method: "POST",
      })) as KeyDto
      setKey(result)
    } catch (err) {
      setKeySaveError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setVerifyBusy(false)
    }
  }, [key])

  const rotate = React.useCallback(
    async (apiKey: string) => {
      if (!key) return
      setRotateBusy(true)
      setKeySaveError(null)
      try {
        const result = (await apiFetch(`/api/keys/${encodeURIComponent(key.id)}/rotate`, {
          method: "POST",
          body: JSON.stringify({ api_key: apiKey }),
        })) as KeyDto
        setKey(result)
        await Promise.all([loadAgents(result.provider), loadIntegration(result.provider)])
      } catch (err) {
        setKeySaveError(err instanceof Error ? err.message : "Rotate failed")
      } finally {
        setRotateBusy(false)
      }
    },
    [key, loadAgents, loadIntegration],
  )

  const saveCredential = React.useCallback(
    async (apiKey: string) => {
      if (!key) return
      const needsCreate =
        key.status === "unknown" ||
        key.status === "invalid" ||
        key.status === "revoked" ||
        key.status === "expired"
      if (needsCreate && key.key_source !== "env") {
        setRotateBusy(true)
        setKeySaveError(null)
        try {
          const result = (await apiFetch("/api/keys", {
            method: "POST",
            body: JSON.stringify({
              domain_id: domainId,
              provider: key.provider,
              key_source: key.key_source === "platform" ? "platform" : "user",
              api_key: apiKey,
            }),
          })) as KeyDto
          setKey(result)
          await Promise.all([loadAgents(result.provider), loadIntegration(result.provider)])
        } catch (err) {
          setKeySaveError(err instanceof Error ? err.message : "Failed to save key")
        } finally {
          setRotateBusy(false)
        }
        return
      }
      await rotate(apiKey)
    },
    [key, domainId, loadAgents, loadIntegration, rotate],
  )

  const revoke = React.useCallback(async () => {
    if (!key) return
    try {
      const result = (await apiFetch(`/api/keys/${encodeURIComponent(key.id)}`, {
        method: "DELETE",
      })) as KeyDto
      setKey(result)
    } catch (err) {
      setKeySaveError(err instanceof Error ? err.message : "Revoke failed")
    }
  }, [key])

  if (!key) {
    return { data: null, loading, error, reload }
  }

  return {
    data: {
      key,
      linkedAgents,
      integrationCapabilities,
      verifyBusy,
      rotateBusy,
      keySaveError,
      verify,
      saveCredential,
      rotate,
      revoke,
      reload,
    },
    loading,
    error,
    reload,
  }
}
