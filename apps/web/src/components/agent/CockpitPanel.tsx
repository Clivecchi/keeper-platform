/**
 * CockpitPanel
 * Agent configuration and diagnostics overview panel.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React from "react"
import clsx from "clsx"
import type { KipAgent } from "../../lib/kipApi"
import type { AgentConversationSession } from "../../hooks/useAgentSessions"
import { useFrameContextOptional } from "../../v0/shell/FrameContext"
import { useAuth } from "../../context/AuthContext"
import { apiFetch } from "../../lib/api"
import { formatRelative, shortId } from "./helpers"

type SoleMemoryCard = { id: string; content: string; topic?: string | null; createdAt: string }

export interface CockpitPanelProps {
  agent: KipAgent | null
  sessions: AgentConversationSession[]
  activeSessionId: string | null
  /** Tools/actions the agent can use (e.g. draft.create, moment.create, sole.save) */
  allowedActions?: string[]
  /** Composed system prompt from last run (read-only) */
  composedSystemPrompt?: string | null
  /** Active keeper ID for SOLE records lookup */
  activeKeeperId?: string | null
}

export const CockpitPanel: React.FC<CockpitPanelProps> = ({
  agent,
  sessions,
  activeSessionId,
  allowedActions = [],
  composedSystemPrompt = null,
  activeKeeperId = null,
}) => {
  const { user } = useAuth()
  const [soleCards, setSoleCards] = React.useState<SoleMemoryCard[]>([])
  const activeSession = sessions.find(
    (session) => session.id === activeSessionId,
  )
  const frameCtx = useFrameContextOptional()

  const latestUpdate = sessions[0]?.updatedAt

  const hasKeeper = Boolean(frameCtx?.selection.activeKeeperId)
  const hasJourney = Boolean(frameCtx?.selection.activeJourneyId)
  const modelMaxTokens = agent?.model_settings?.max_tokens ?? 4000

  React.useEffect(() => {
    if (!activeKeeperId || !user?.id) {
      setSoleCards([])
      return
    }
    let active = true
    apiFetch(`/api/keeper/keepers/${activeKeeperId}/memory-cards?userId=${user.id}`)
      .then((res: any) => {
        if (!active) return
        const data = res?.data ?? (Array.isArray(res) ? res : [])
        setSoleCards(Array.isArray(data) ? data.slice(0, 5) : [])
      })
      .catch(() => setSoleCards([]))
    return () => { active = false }
  }, [activeKeeperId, user?.id])

  const activeCapabilities: { name: string; active: boolean }[] = [
    { name: "Keeper context", active: hasKeeper },
    { name: "Journey tracking", active: hasJourney },
    { name: "Moment creation", active: true },
    { name: "SOLE memory", active: hasKeeper },
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
            {hasKeeper
              ? "SOLE memory system active — tracking key life events and journey progress."
              : "No keeper set — SOLE memory is inactive until a keeper is selected."}
          </li>
        </ul>
      </FrameCard>

      <FrameCard title="Agent Configuration">
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

      {composedSystemPrompt && (
        <FrameCard title="Composed System Prompt" subtitle="Read-only view of what the model receives">
          <pre className="max-h-48 overflow-y-auto rounded bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap break-words">
            {composedSystemPrompt}
          </pre>
        </FrameCard>
      )}

      {activeKeeperId && (
        <FrameCard title="SOLE Records" subtitle={soleCards.length ? `${soleCards.length} recent memory cards` : "No memory cards yet"}>
          {soleCards.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {soleCards.map((c) => (
                <li key={c.id} className="rounded border border-gray-200 bg-gray-50 p-2">
                  {c.topic && <span className="text-xs font-medium text-gray-500">[{c.topic}] </span>}
                  <span className="text-gray-800">{(c.content || "").slice(0, 80)}{(c.content || "").length > 80 ? "…" : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">Select a SOLE-enabled keeper and send messages to build memory.</p>
          )}
        </FrameCard>
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
