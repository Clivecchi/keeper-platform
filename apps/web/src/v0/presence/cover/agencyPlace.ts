/** Read-only Agency Place facts — matches GET /api/domains/:id/agency-place */

export type AgencyPlaceLayer = {
  key: string
  label: string
  status: string
}

export type AgencyPlaceFacts = {
  domainId: string
  domainName: string
  domainSlug: string
  entrusted: {
    ownerName: string | null
    ownerUserId: string | null
    leadName: string | null
    leadRole: string | null
    peopleCount: number | null
  }
  contract: {
    name: string
    version: string
    enforcementMode: string
  } | null
  lens: {
    name: string
    source: "domain" | "default"
  } | null
  lastPerformance: {
    messageId: string
    dialogId: string
    dialogTitle: string
    recordedAt: string
    agentId: string
    agentName: string
    layers: AgencyPlaceLayer[]
  } | null
}

export function parseAgencyPlacePayload(raw: unknown): AgencyPlaceFacts | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const body = raw as Record<string, unknown>
  const data =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : body
  const domainId = typeof data.domainId === "string" ? data.domainId.trim() : ""
  const domainName = typeof data.domainName === "string" ? data.domainName.trim() : ""
  const domainSlug = typeof data.domainSlug === "string" ? data.domainSlug.trim() : ""
  if (!domainId || !domainName) return null

  const entrustedRaw =
    data.entrusted && typeof data.entrusted === "object" && !Array.isArray(data.entrusted)
      ? (data.entrusted as Record<string, unknown>)
      : {}

  const contractRaw =
    data.contract && typeof data.contract === "object" && !Array.isArray(data.contract)
      ? (data.contract as Record<string, unknown>)
      : null
  const lensRaw =
    data.lens && typeof data.lens === "object" && !Array.isArray(data.lens)
      ? (data.lens as Record<string, unknown>)
      : null
  const perfRaw =
    data.lastPerformance && typeof data.lastPerformance === "object" && !Array.isArray(data.lastPerformance)
      ? (data.lastPerformance as Record<string, unknown>)
      : null

  const peopleCount =
    typeof entrustedRaw.peopleCount === "number" && Number.isFinite(entrustedRaw.peopleCount)
      ? entrustedRaw.peopleCount
      : null

  return {
    domainId,
    domainName,
    domainSlug,
    entrusted: {
      ownerName: stringOrNull(entrustedRaw.ownerName),
      ownerUserId: stringOrNull(entrustedRaw.ownerUserId),
      leadName: stringOrNull(entrustedRaw.leadName),
      leadRole: stringOrNull(entrustedRaw.leadRole),
      peopleCount,
    },
    contract:
      contractRaw && stringOrNull(contractRaw.name) && stringOrNull(contractRaw.version)
        ? {
            name: String(contractRaw.name).trim(),
            version: String(contractRaw.version).trim(),
            enforcementMode: stringOrNull(contractRaw.enforcementMode) || "warn",
          }
        : null,
    lens:
      lensRaw && stringOrNull(lensRaw.name) && (lensRaw.source === "domain" || lensRaw.source === "default")
        ? { name: String(lensRaw.name).trim(), source: lensRaw.source }
        : null,
    lastPerformance: parseLastPerformance(perfRaw),
  }
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function parseLastPerformance(
  raw: Record<string, unknown> | null,
): AgencyPlaceFacts["lastPerformance"] {
  if (!raw) return null
  const dialogId = stringOrNull(raw.dialogId)
  const dialogTitle = stringOrNull(raw.dialogTitle)
  const messageId = stringOrNull(raw.messageId)
  const agentId = stringOrNull(raw.agentId)
  const agentName = stringOrNull(raw.agentName)
  if (!dialogId || !dialogTitle || !messageId || !agentId || !agentName) return null
  const layers = Array.isArray(raw.layers)
    ? raw.layers.flatMap((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return []
        const layer = row as Record<string, unknown>
        const key = stringOrNull(layer.key)
        const label = stringOrNull(layer.label)
        const status = stringOrNull(layer.status)
        if (!key || !label || !status) return []
        return [{ key, label, status }]
      })
    : []
  return {
    messageId,
    dialogId,
    dialogTitle,
    recordedAt: stringOrNull(raw.recordedAt) || "",
    agentId,
    agentName,
    layers,
  }
}

export function agencyEntrustedLine(facts: AgencyPlaceFacts): string | undefined {
  const people = facts.entrusted.ownerName
  const lead = facts.entrusted.leadName
  const role = facts.entrusted.leadRole
  if (people && lead) {
    return role ? `${people} · ${lead} as ${role}` : `${people} · ${lead}`
  }
  if (people) return people
  if (lead) return role ? `${lead} as ${role}` : lead
  return undefined
}

export function agencyPlaceTraits(facts: AgencyPlaceFacts): Array<{ label: string; value: string }> {
  const traits: Array<{ label: string; value: string }> = []
  if (facts.entrusted.leadName) {
    traits.push({
      label: "Lead",
      value: facts.entrusted.leadRole
        ? `${facts.entrusted.leadName} · ${facts.entrusted.leadRole}`
        : facts.entrusted.leadName,
    })
  }
  if (facts.entrusted.peopleCount != null) {
    const n = facts.entrusted.peopleCount
    traits.push({
      label: "People",
      value: n === 1 ? "1 person" : `${n} people`,
    })
  }
  if (facts.contract) {
    traits.push({
      label: "Contract",
      value: `${facts.contract.name} ${facts.contract.version} · ${facts.contract.enforcementMode}`,
    })
  }
  return traits
}

export function workingAgencyHeld(facts: AgencyPlaceFacts): boolean {
  if (facts.contract || facts.lens) return true
  const layers = facts.lastPerformance?.layers ?? []
  return layers.some(
    (layer) =>
      (layer.key === "domain_lens" || layer.key === "domain_contract" || layer.key === "lead_judgment") &&
      layer.status === "recorded",
  )
}
