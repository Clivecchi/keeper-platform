"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import type { CapabilityGrantSource, CapabilityUsedByEntry } from "./feeds/CapabilityFeed"

export type AgentPickerOption = {
  id: string
  name: string
  slug: string
}

export async function fetchAgentPickerOptions(): Promise<AgentPickerOption[]> {
  const res = (await apiFetch("/api/kip/agents")) as {
    success?: boolean
    data?: Array<{ id: string; name: string; slug: string }>
    agents?: Array<{ id: string; name: string; slug: string }>
  }
  const rows = Array.isArray(res.data)
    ? res.data
    : Array.isArray(res.agents)
      ? res.agents
      : []
  return rows.map((agent) => ({
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
  }))
}

export async function createCapabilityGrant(
  capabilityId: string,
  agentId: string,
): Promise<CapabilityUsedByEntry[]> {
  const res = (await apiFetch(`/api/capabilities/${encodeURIComponent(capabilityId)}/grants`, {
    method: "POST",
    body: JSON.stringify({ agentId }),
  })) as { used_by: CapabilityUsedByEntry[] }
  return res.used_by ?? []
}

export async function deleteCapabilityGrant(
  capabilityId: string,
  agentId: string,
): Promise<CapabilityUsedByEntry[]> {
  const res = (await apiFetch(
    `/api/capabilities/${encodeURIComponent(capabilityId)}/grants/${encodeURIComponent(agentId)}`,
    { method: "DELETE" },
  )) as { used_by: CapabilityUsedByEntry[] }
  return res.used_by ?? []
}

export function formatGrantSource(source: CapabilityGrantSource): string {
  return source
}
