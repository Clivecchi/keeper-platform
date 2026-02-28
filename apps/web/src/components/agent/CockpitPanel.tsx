/**
 * CockpitPanel
 * Agent configuration and diagnostics overview panel.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React from "react"
import clsx from "clsx"
import type { KipAgent, ModelProvider, ModelSettings } from "../../lib/kipApi"
import { KipApi } from "../../lib/kipApi"
import type { AgentConversationSession } from "../../hooks/useAgentSessions"
import { useFrameContextOptional } from "../../v0/shell/FrameContext"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"
import { getDomainCompliance, type ComplianceMetrics } from "../../lib/governanceApi"
import { formatRelative, shortId } from "./helpers"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../features/board-studio/v0/components/ui/dialog"

type SoleMemoryCard = {
  id: string
  content: string
  topic?: string | null
  createdAt?: string
  journeyId?: string | null
  momentId?: string | null
  engagementTemplateId?: string | null
}

/** SOLE Records card with expand-to-view and inline edit */
function SoleRecordsCard({
  soleCards,
  activeKeeperId,
  domainId,
  userId,
  onRefresh,
}: {
  soleCards: SoleMemoryCard[]
  activeKeeperId: string | null
  domainId: string | null
  userId: string | null
  onRefresh: () => void
}) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editContent, setEditContent] = React.useState("")
  const [editTopic, setEditTopic] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  const handleEdit = (c: SoleMemoryCard) => {
    setEditingId(c.id)
    setEditContent(c.content || "")
    setEditTopic(c.topic || "")
  }
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent("")
    setEditTopic("")
  }
  const handleSave = async () => {
    if (!editingId || !editContent.trim()) return
    setIsSaving(true)
    try {
      const url = activeKeeperId
        ? `/api/keeper/memory-cards/${editingId}?userId=${userId}`
        : domainId
          ? `/api/domains/${domainId}/kip/sole-memory-cards/${editingId}`
          : null
      if (!url) return
      await apiFetch(url, {
        method: "PUT",
        body: JSON.stringify({ content: editContent.trim(), topic: editTopic.trim() || undefined }),
      })
      setEditingId(null)
      onRefresh()
    } catch {
      /* ignore */
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FrameCard
      title="SOLE Records"
      subtitle={
        soleCards.length
          ? `${soleCards.length} recent memory cards${activeKeeperId ? " (keeper)" : " (domain anchor)"} — click to expand, edit inline`
          : "No memory cards yet"
      }
    >
      {soleCards.length > 0 ? (
        <ul className="space-y-2 text-sm text-gray-700">
          {soleCards.map((c) => (
            <li key={c.id} className="rounded border border-gray-200 bg-gray-50 p-2">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Topic (optional)"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <textarea
                    placeholder="Content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || !editContent.trim()}
                      className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(c.journeyId || c.momentId || c.engagementTemplateId) && (
                    <div className="mb-1 flex flex-wrap gap-1 text-xs text-gray-500">
                      {c.journeyId && <span title={c.journeyId}>Journey</span>}
                      {c.momentId && <span title={c.momentId}>Moment</span>}
                      {c.engagementTemplateId && <span title={c.engagementTemplateId}>Template</span>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="w-full text-left"
                  >
                    {c.topic && <span className="text-xs font-medium text-gray-500">[{c.topic}] </span>}
                    <span className="text-gray-800">
                      {expandedId === c.id ? (c.content || "") : (c.content || "").slice(0, 80)}
                      {(c.content || "").length > 80 && expandedId !== c.id ? "…" : ""}
                    </span>
                  </button>
                  {expandedId === c.id && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="text-xs underline text-gray-500 hover:text-gray-700"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">
          {domainId
            ? "Send messages to build domain anchor memory, or select a keeper for keeper-specific SOLE."
            : "Select a SOLE-enabled keeper and send messages to build memory."}
        </p>
      )}
    </FrameCard>
  )
}

export interface CockpitPanelProps {
  agent: KipAgent | null
  sessions: AgentConversationSession[]
  activeSessionId: string | null
  /** Tools/actions the agent can use (e.g. draft.create, moment.create, sole.save) */
  allowedActions?: string[]
  /** Composed system prompt (from action pack preview or last run) */
  composedSystemPrompt?: string | null
  /** Active keeper ID for keeper-scoped SOLE records */
  activeKeeperId?: string | null
  /** Domain ID for domain anchor SOLE when no keeper selected (Option B) */
  domainId?: string | null
  /** SOLE status: soleActive (domain-wide), keeperSharpening (keeper-specific) */
  soleStatus?: { soleActive: boolean; keeperSharpening?: boolean; memoryCount?: number } | null
  /** Show governance compliance panel (admin view) */
  showCompliance?: boolean
  /** Called when agent config is updated (e.g. model change) so parent can refresh */
  onAgentUpdated?: (updated: KipAgent) => void
}

export const CockpitPanel: React.FC<CockpitPanelProps> = ({
  agent,
  sessions,
  activeSessionId,
  allowedActions = [],
  composedSystemPrompt = null,
  activeKeeperId = null,
  domainId = null,
  soleStatus = null,
  showCompliance = false,
  onAgentUpdated,
}) => {
  const { user } = useAuth()
  const [soleCards, setSoleCards] = React.useState<SoleMemoryCard[]>([])
  const [complianceMetrics, setComplianceMetrics] = React.useState<ComplianceMetrics | null>(null)
  const [modelModalOpen, setModelModalOpen] = React.useState(false)
  const [modelCatalog, setModelCatalog] = React.useState<{
    providers: string[]
    models: Array<{ id: string; label: string; provider: string }>
    defaults: Record<string, string>
  } | null>(null)
  const [modelsLoading, setModelsLoading] = React.useState(false)
  const [modelForm, setModelForm] = React.useState<{ provider: ModelProvider; model: string; temperature?: number; max_tokens?: number }>({
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 2000,
  })
  const [isSavingModel, setIsSavingModel] = React.useState(false)
  const [modelSaveError, setModelSaveError] = React.useState<string | null>(null)
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId,
  )
  const frameCtx = useFrameContextOptional()

  const latestUpdate = sessions[0]?.updatedAt

  const hasKeeper = Boolean(frameCtx?.selection.activeKeeperId)
  const hasJourney = Boolean(frameCtx?.selection.activeJourneyId)
  const modelMaxTokens = agent?.model_settings?.max_tokens ?? 4000
  const soleActive = soleStatus?.soleActive ?? hasKeeper
  const keeperSharpening = soleStatus?.keeperSharpening ?? false

  React.useEffect(() => {
    if (!user?.id) {
      setSoleCards([])
      return
    }
    // Option B: keeper-scoped when activeKeeperId; domain anchor when domainId only
    const url = activeKeeperId
      ? `/api/keeper/keepers/${activeKeeperId}/memory-cards?userId=${user.id}`
      : domainId
        ? `/api/domains/${domainId}/kip/sole-memory-cards`
        : null
    if (!url) {
      setSoleCards([])
      return
    }
    let active = true
    apiFetch(url)
      .then((res: any) => {
        if (!active) return
        const raw = res?.data ?? res
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])
        setSoleCards(arr.slice(0, 10))
      })
      .catch(() => setSoleCards([]))
    return () => { active = false }
  }, [activeKeeperId, domainId, user?.id])

  const loadModelsForProvider = React.useCallback((provider: ModelProvider) => {
    setModelsLoading(true)
    KipApi.getModelCatalog(provider)
      .then((c) => c && setModelCatalog(c))
      .catch(() => setModelCatalog(null))
      .finally(() => setModelsLoading(false))
  }, [])

  React.useEffect(() => {
    if (modelModalOpen) {
      if (agent) {
        const provider = (agent.model_provider || "openai") as ModelProvider
        const model = agent.model_settings?.model || agent.model || "gpt-4o"
        setModelForm({
          provider,
          model,
          temperature: agent.model_settings?.temperature ?? 0.7,
          max_tokens: agent.model_settings?.max_tokens ?? 2000,
        })
        loadModelsForProvider(provider)
      } else {
        loadModelsForProvider("openai")
      }
      setModelSaveError(null)
    }
  }, [modelModalOpen, agent, loadModelsForProvider])

  const handleSaveModel = async () => {
    if (!agent?.id || !onAgentUpdated) return
    setIsSavingModel(true)
    setModelSaveError(null)
    try {
      const model_settings: ModelSettings = {
        model: modelForm.model,
        temperature: modelForm.temperature ?? 0.7,
        max_tokens: modelForm.max_tokens ?? 2000,
        retry: { max_retries: 3, retry_delay_ms: 1000 },
      }
      const updated = await KipApi.updateAgent(agent.id, {
        model_provider: modelForm.provider,
        model_settings,
      })
      onAgentUpdated(updated)
      setModelModalOpen(false)
    } catch (err) {
      setModelSaveError(err instanceof Error ? err.message : "Failed to update model")
    } finally {
      setIsSavingModel(false)
    }
  }

  const providerModelsRaw = modelCatalog?.models?.filter((m) => m.provider === modelForm.provider) ?? []
  const fallbackModels = KipApi.getAvailableModels(modelForm.provider).map((id) => ({ id, label: id }))
  const providerModels =
    providerModelsRaw.length > 0
      ? providerModelsRaw
      : fallbackModels
  const hasCurrentModel = providerModels.some((m) => m.id === modelForm.model)
  const modelsToShow =
    hasCurrentModel || !modelForm.model
      ? providerModels
      : [{ id: modelForm.model, label: `${modelForm.model} (current)` }, ...providerModels]

  React.useEffect(() => {
    if (!showCompliance || !domainId) {
      setComplianceMetrics(null)
      return
    }
    getDomainCompliance(domainId, 50)
      .then(setComplianceMetrics)
      .catch(() => setComplianceMetrics(null))
  }, [showCompliance, domainId])

  const activeCapabilities: { name: string; active: boolean }[] = [
    { name: "Keeper context", active: hasKeeper },
    { name: "Journey tracking", active: hasJourney },
    { name: "Moment creation", active: true },
    { name: "SOLE memory", active: soleActive },
    { name: "Draft management", active: true },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FrameCard title="Memory" subtitle="SOLE memory engine">
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-center justify-between">
            <span>Active session</span>
            <span className="font-semibold">
              {activeSession ? shortId(activeSession.id) : "None"}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Max output tokens</span>
            <span className="font-semibold">
              {modelMaxTokens.toLocaleString()}
            </span>
          </li>
          <li className="text-xs text-gray-500">
            {soleActive
              ? keeperSharpening
                ? "SOLE memory system active (keeper-sharpened) — tracking key life events and journey progress."
                : "SOLE memory system active — tracking key life events and journey progress."
              : "No domain context — SOLE is inactive."}
          </li>
        </ul>
      </FrameCard>

      <FrameCard
        title="Agent Configuration"
        action={
          onAgentUpdated && agent ? (
            <button
              type="button"
              onClick={() => setModelModalOpen(true)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
            >
              Change model
            </button>
          ) : null
        }
      >
        <dl className="space-y-3 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <dt>Provider</dt>
            <dd className="font-semibold">
              {agent?.model_provider
                ? agent.model_provider.toUpperCase()
                : "OPENAI"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Model</dt>
            <dd className="font-semibold">
              {agent?.model_settings?.model || agent?.model}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>Temperature</dt>
            <dd className="font-semibold">
              {agent?.model_settings?.temperature ?? 0.7}
            </dd>
          </div>
          <div className="text-xs text-gray-500">
            System prompt:{" "}
            {typeof agent?.config?.prompt_label === "string"
              ? agent.config.prompt_label
              : "Custom"}
          </div>
        </dl>
      </FrameCard>

      <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {modelSaveError && (
              <p className="text-sm text-red-600">{modelSaveError}</p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Provider</label>
              <select
                value={modelForm.provider}
                onChange={(e) => {
                  const p = e.target.value as ModelProvider
                  const defaults = modelCatalog?.defaults
                  const defaultModel = defaults?.[p] ?? KipApi.getDefaultSettings(p).model
                  setModelForm((prev) => ({ ...prev, provider: p, model: defaultModel }))
                  loadModelsForProvider(p)
                }}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="together">Together AI</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
              <select
                value={modelForm.model}
                onChange={(e) => setModelForm((prev) => ({ ...prev, model: e.target.value }))}
                disabled={modelsLoading}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                {modelsLoading ? (
                  <option value={modelForm.model}>{modelForm.model} (loading…)</option>
                ) : (
                  modelsToShow.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={modelForm.temperature ?? 0.7}
                  onChange={(e) =>
                    setModelForm((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Max tokens</label>
                <input
                  type="number"
                  min={100}
                  max={16000}
                  step={100}
                  value={modelForm.max_tokens ?? 2000}
                  onChange={(e) =>
                    setModelForm((prev) => ({ ...prev, max_tokens: parseInt(e.target.value, 10) || 2000 }))
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setModelModalOpen(false)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveModel}
              disabled={isSavingModel}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isSavingModel ? "Saving…" : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {composedSystemPrompt && (
        <FrameCard title="Composed System Prompt" subtitle="Full system prompt the model receives (read-only)">
          <pre className="max-h-96 overflow-y-auto rounded bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
            {composedSystemPrompt}
          </pre>
        </FrameCard>
      )}

      {(activeKeeperId || domainId) && (
        <SoleRecordsCard
          soleCards={soleCards}
          activeKeeperId={activeKeeperId}
          domainId={domainId}
          userId={user?.id ?? null}
          onRefresh={() => {
            const url = activeKeeperId
              ? `/api/keeper/keepers/${activeKeeperId}/memory-cards?userId=${user?.id}`
              : domainId
                ? `/api/domains/${domainId}/kip/sole-memory-cards`
                : null
            if (url)
              apiFetch(url)
                .then((res: any) => {
                  const raw = res?.data ?? res
                  const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : [])
                  setSoleCards(arr.slice(0, 10))
                })
                .catch(() => {})
          }}
        />
      )}

      <FrameCard title="Tools & Integrations" subtitle="Actions the agent can use">
        <ul className="space-y-2 text-sm">
          {allowedActions.length > 0 ? (
            <>
              {allowedActions.map((action) => (
                <li key={action} className="flex items-center gap-2 text-emerald-600">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{action}</code>
                </li>
              ))}
            </>
          ) : (
            <>
              {activeCapabilities.map((cap) => (
                <li
                  key={cap.name}
                  className={clsx(
                    "flex items-center gap-2",
                    cap.active ? "text-emerald-600" : "text-gray-400",
                  )}
                >
                  <span
                    className={clsx(
                      "h-2 w-2 rounded-full",
                      cap.active ? "bg-emerald-500" : "bg-gray-300",
                    )}
                  />
                  {cap.name} {cap.active ? "enabled" : "unavailable"}
                </li>
              ))}
              {agent?.tools?.length ? (
                <li className="text-xs text-gray-500">
                  {agent.tools.join(", ")}
                </li>
              ) : null}
            </>
          )}
        </ul>
      </FrameCard>

      <FrameCard title="Diagnostics">
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-center justify-between">
            <span>Last session</span>
            <span className="font-semibold">
              {latestUpdate ? formatRelative(latestUpdate) : "—"}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Sessions tracked</span>
            <span className="font-semibold">{sessions.length}</span>
          </li>
          <li className="text-xs text-gray-500">
            Status: Operational (updated{" "}
            {latestUpdate ? formatRelative(latestUpdate) : "now"})
          </li>
        </ul>
      </FrameCard>

      {showCompliance && domainId && (
        <FrameCard title="Governance Compliance" subtitle="Admin view — Draft Trigger and Tool-First metrics">
          {complianceMetrics ? (
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center justify-between">
                <span>Draft Trigger Success</span>
                <span className="font-semibold">
                  {complianceMetrics.metrics.draftTriggerSuccessPct != null
                    ? `${complianceMetrics.metrics.draftTriggerSuccessPct.toFixed(1)}%`
                    : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Tool-First Violations</span>
                <span className="font-semibold">{complianceMetrics.metrics.toolFirstViolations}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Total checks</span>
                <span className="font-semibold">{complianceMetrics.metrics.totalChecks}</span>
              </li>
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Loading compliance data…</p>
          )}
        </FrameCard>
      )}
    </div>
  )
}

/** Utility card used within CockpitPanel and other agent views */
export const FrameCard: React.FC<{
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}> = ({ title, subtitle, action, children }) => (
  <div className="rounded-2xl border border-[#E6DED5] bg-white p-6 shadow-sm">
    {(title || action) && (
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title && (
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          )}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
)

export default CockpitPanel
