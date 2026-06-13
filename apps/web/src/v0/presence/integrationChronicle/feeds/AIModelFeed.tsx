"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"
import { KipApi } from "../../../../lib/kipApi"
import type { IntegrationDto } from "../shared"
import type { FeedDataState } from "../serviceConfig"

export type KeyHealthStatus = "valid" | "invalid" | "missing"
export type KeyHealthSource = "env" | "user" | "platform" | "none"

export type KeyHealth = {
  status: KeyHealthStatus
  source: KeyHealthSource
  lastChecked: string
  errorMessage?: string
  hint?: string
}

export type LinkedAgent = {
  id: string
  name: string
  model: string
}

/** Feed data for AI model integrations — credential POST actions; metadata saves via Config mode. */
export type AIModelFeedData = {
  serviceSlug: string
  isGateway: boolean
  keyHealth: KeyHealth | null
  integration: IntegrationDto | null
  linkedAgents: LinkedAgent[]
  staticModelCount: number
  testResult: string | null
  keySaveBusy: boolean
  keySaveError: string | null
  refreshBusy: boolean
  reloadKeyHealth: () => Promise<void>
  reloadAgents: () => Promise<void>
  refreshCatalog: () => Promise<void>
  saveKey: (key: string) => Promise<void>
  setTestResult: (value: string | null) => void
}

export function useAIModelFeedData(
  serviceSlug: string,
  params: { domainId: string; connected: boolean; enabled: boolean },
): FeedDataState<AIModelFeedData> {
  const [keyHealth, setKeyHealth] = React.useState<KeyHealth | null>(null)
  const [integration, setIntegration] = React.useState<IntegrationDto | null>(null)
  const [linkedAgents, setLinkedAgents] = React.useState<LinkedAgent[]>([])
  const [staticModelCount, setStaticModelCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [testResult, setTestResult] = React.useState<string | null>(null)
  const [keySaveBusy, setKeySaveBusy] = React.useState(false)
  const [keySaveError, setKeySaveError] = React.useState<string | null>(null)
  const [refreshBusy, setRefreshBusy] = React.useState(false)

  const reloadKeyHealth = React.useCallback(async () => {
    const body = (await apiFetch(
      `/api/integrations/${encodeURIComponent(serviceSlug)}/key-health`,
    )) as KeyHealth & { service?: string }
    setKeyHealth({
      status: body.status,
      source: body.source,
      lastChecked: body.lastChecked,
      errorMessage: body.errorMessage,
      hint: body.hint,
    })
  }, [serviceSlug])

  const reloadIntegration = React.useCallback(async () => {
    const list = (await apiFetch(
      `/api/integrations?domainId=${encodeURIComponent(params.domainId)}`,
    )) as IntegrationDto[]
    setIntegration(
      list.find((row) => row.service === serviceSlug && row.tier === "platform") ??
        list.find((row) => row.service === serviceSlug) ??
        null,
    )
  }, [params.domainId, serviceSlug])

  const reloadAgents = React.useCallback(async () => {
    const agents = await KipApi.getAllAgents()
    setLinkedAgents(
      agents
        .filter((agent) => agent.model_provider === serviceSlug)
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
          model: agent.model_settings?.model || agent.model || "—",
        })),
    )
  }, [serviceSlug])

  const reloadStaticModelCount = React.useCallback(async () => {
    const catalog = await KipApi.getModelCatalog(serviceSlug as never)
    if (catalog?.models?.length) {
      setStaticModelCount(catalog.models.length)
      return
    }
    setStaticModelCount(KipApi.getAvailableModels(serviceSlug as never).length)
  }, [serviceSlug])

  const reload = React.useCallback(async () => {
    if (!params.enabled) return
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        reloadKeyHealth(),
        reloadIntegration(),
        reloadAgents(),
        reloadStaticModelCount(),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI provider status")
    } finally {
      setLoading(false)
    }
  }, [
    params.enabled,
    reloadAgents,
    reloadIntegration,
    reloadKeyHealth,
    reloadStaticModelCount,
  ])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const refreshCatalog = React.useCallback(async () => {
    setRefreshBusy(true)
    setError(null)
    try {
      await apiFetch(`/api/integrations/${encodeURIComponent(serviceSlug)}/catalog/refresh`, {
        method: "POST",
      })
      await reloadIntegration()
      await reloadStaticModelCount()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh model catalog")
    } finally {
      setRefreshBusy(false)
    }
  }, [reloadIntegration, reloadStaticModelCount, serviceSlug])

  const saveKey = React.useCallback(
    async (key: string) => {
      setKeySaveBusy(true)
      setKeySaveError(null)
      try {
        const result = (await apiFetch(
          `/api/integrations/${encodeURIComponent(serviceSlug)}/key`,
          {
            method: "POST",
            body: JSON.stringify({ key, level: "user" }),
          },
        )) as { ok?: boolean; error?: string; hint?: string }
        if (!result.ok) {
          throw new Error(result.hint ?? result.error ?? "Key was not accepted")
        }
        await reload()
      } catch (err) {
        setKeySaveError(err instanceof Error ? err.message : "Failed to save key")
      } finally {
        setKeySaveBusy(false)
      }
    },
    [reload, serviceSlug],
  )

  return {
    data: {
      serviceSlug,
      isGateway: serviceSlug === "together-ai",
      keyHealth,
      integration,
      linkedAgents,
      staticModelCount,
      testResult,
      keySaveBusy,
      keySaveError,
      refreshBusy,
      reloadKeyHealth,
      reloadAgents,
      refreshCatalog,
      saveKey,
      setTestResult,
    },
    loading,
    error,
    reload,
  }
}
