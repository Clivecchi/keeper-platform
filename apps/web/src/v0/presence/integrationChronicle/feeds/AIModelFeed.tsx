"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"
import { KipApi } from "../../../../lib/kipApi"
import {
  ActionButton,
  FeedError,
  FeedShimmer,
  formatRelativeTime,
  type IntegrationDto,
} from "../shared"
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

export type AIModelFeedData = {
  serviceSlug: string
  isGateway: boolean
  keyHealth: KeyHealth | null
  integration: IntegrationDto | null
  linkedAgents: LinkedAgent[]
  staticModelCount: number
  testResult: string | null
  keyInput: string
  keySaveBusy: boolean
  keySaveError: string | null
  keySaveSuccess: string | null
  refreshBusy: boolean
  reloadKeyHealth: () => Promise<void>
  reloadAgents: () => Promise<void>
  refreshCatalog: () => Promise<void>
  saveKey: (key: string) => Promise<void>
  setKeyInput: (value: string) => void
  setTestResult: (value: string | null) => void
}

function Badge({
  label,
  tone = "neutral",
}: {
  label: string
  tone?: "neutral" | "success" | "warning" | "error" | "info"
}) {
  const colors: Record<string, string> = {
    neutral: "hsl(var(--theme-border-soft) / 0.55)",
    success: "hsl(152 69% 43% / 0.25)",
    warning: "hsl(38 92% 50% / 0.25)",
    error: "hsl(0 70% 50% / 0.2)",
    info: "hsl(210 80% 55% / 0.2)",
  }
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        borderColor: colors[tone],
        color: "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label}
    </span>
  )
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-wide mb-2"
      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
    >
      {children}
    </p>
  )
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
  const [keyInput, setKeyInput] = React.useState("")
  const [keySaveBusy, setKeySaveBusy] = React.useState(false)
  const [keySaveError, setKeySaveError] = React.useState<string | null>(null)
  const [keySaveSuccess, setKeySaveSuccess] = React.useState<string | null>(null)
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
      setKeySaveSuccess(null)
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
        setKeySaveSuccess("Key verified and saved.")
        setKeyInput("")
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
      keyInput,
      keySaveBusy,
      keySaveError,
      keySaveSuccess,
      refreshBusy,
      reloadKeyHealth,
      reloadAgents,
      refreshCatalog,
      saveKey,
      setKeyInput,
      setTestResult,
    },
    loading,
    error,
    reload,
  }
}

export function AIModelFeed({
  feed,
}: {
  feed: FeedDataState<AIModelFeedData>
  domainId: string
  boardId: string
  agentSlug: string
}) {
  const d = feed.data

  if (feed.loading && !d.keyHealth) {
    return <FeedShimmer rows={4} />
  }

  if (feed.error && !d.keyHealth) {
    return <FeedError message={feed.error} onRetry={() => void feed.reload()} />
  }

  const catalogMeta = d.integration?.metadata as
    | {
        catalog?: {
          items?: unknown[]
          fetchedAt?: string
          source?: "live" | "fallback"
        }
      }
    | undefined
  const catalogItems = catalogMeta?.catalog?.items ?? []
  const catalogFetchedAt = catalogMeta?.catalog?.fetchedAt
  const catalogSource = catalogMeta?.catalog?.source

  const statusLabel =
    d.keyHealth?.status === "valid"
      ? "Valid"
      : d.keyHealth?.status === "invalid"
        ? "Invalid"
        : "Missing"

  const statusTone =
    d.keyHealth?.status === "valid"
      ? "success"
      : d.keyHealth?.status === "invalid"
        ? "error"
        : "warning"

  const showKeyInput =
    d.keyHealth?.status === "invalid" || d.keyHealth?.status === "missing"

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-md border px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
      >
        <BlockTitle>Key health</BlockTitle>
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge
            label={(d.keyHealth?.source ?? "none").toUpperCase()}
            tone="info"
          />
          <Badge label={statusLabel} tone={statusTone} />
        </div>
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Last verified {formatRelativeTime(d.keyHealth?.lastChecked)}
        </p>
        {d.keyHealth?.errorMessage && (
          <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
            {d.keyHealth.errorMessage}
          </p>
        )}

        {showKeyInput && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              This key is not working. Paste a valid key to reconnect.
            </p>
            <input
              type="password"
              value={d.keyInput}
              onChange={(e) => d.setKeyInput(e.target.value)}
              placeholder="Paste API key"
              className="w-full rounded-md border px-2.5 py-1.5 text-[12px] bg-transparent"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                color: "hsl(var(--theme-ink-primary))",
              }}
            />
            <ActionButton
              label={d.keySaveBusy ? "Verifying…" : "Verify and Save"}
              onClick={() => void d.saveKey(d.keyInput)}
              disabled={d.keySaveBusy || !d.keyInput.trim()}
            />
            {d.keySaveError && (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
                {d.keySaveError}
              </p>
            )}
            {d.keySaveSuccess && (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-success))" }}>
                {d.keySaveSuccess}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className="rounded-md border px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
      >
        <BlockTitle>Available models</BlockTitle>
        {d.isGateway ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge label={`${catalogItems.length || d.staticModelCount} models`} />
              <Badge
                label={(catalogSource ?? "fallback").toUpperCase()}
                tone={catalogSource === "live" ? "success" : "warning"}
              />
            </div>
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Last fetched {formatRelativeTime(catalogFetchedAt)}
            </p>
            <div className="mt-2">
              <ActionButton
                label={d.refreshBusy ? "Refreshing…" : "Refresh Models"}
                onClick={() => void d.refreshCatalog()}
                disabled={d.refreshBusy}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Badge label={`${d.staticModelCount} models`} />
            <Badge label="STATIC" tone="neutral" />
          </div>
        )}
      </div>

      <div
        className="rounded-md border px-3 py-3"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
      >
        <BlockTitle>Linked agents</BlockTitle>
        {d.linkedAgents.length === 0 ? (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            No agents using this provider
          </p>
        ) : (
          <ul className="space-y-1.5">
            {d.linkedAgents.map((agent) => (
              <li
                key={agent.id}
                className="text-[12px]"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                <span style={{ color: "hsl(var(--theme-ink-primary))" }}>{agent.name}</span>
                <span className="opacity-70"> · {agent.model}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {d.testResult && (
        <p className="text-[12px] whitespace-pre-wrap" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {d.testResult}
        </p>
      )}
    </div>
  )
}
