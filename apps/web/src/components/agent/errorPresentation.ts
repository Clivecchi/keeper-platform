export type AgentErrorTone = "danger" | "warning"

export interface AgentErrorPresentation {
  title: string
  detail: string
  tone: AgentErrorTone
}

export function getAgentErrorPresentation(
  error: string,
  agentName = "Kip",
): AgentErrorPresentation {
  const detail = error.trim()
  const lower = detail.toLowerCase()
  const name = agentName.trim() || "Kip"

  if (lower.includes("credits") || lower.includes("quota") || lower.includes("billing")) {
    return {
      title: "AI model needs credits",
      detail,
      tone: "warning",
    }
  }

  if (lower.includes("overloaded") || lower.includes("temporarily unavailable") || lower.includes("provider status: 529")) {
    return {
      title: `${name} is temporarily overloaded`,
      detail,
      tone: "warning",
    }
  }

  if (lower.includes("timed out") || lower.includes("timeout")) {
    return {
      title: "System timeout",
      detail,
      tone: "danger",
    }
  }

  if (
    lower.includes("http 502") ||
    lower.includes("http 503") ||
    lower.includes("http 504") ||
    lower.includes("bad gateway") ||
    lower.includes("gateway")
  ) {
    return {
      title: `Connection to ${name} dropped`,
      detail:
        detail ||
        `The request was cut off before ${name} finished. Try again — long board turns are split into shorter steps now.`,
      tone: "warning",
    }
  }

  if (lower.includes("api key") || lower.includes("provider key")) {
    return {
      title: `${name} needs a provider key`,
      detail,
      tone: "warning",
    }
  }

  if (lower.includes("model") && (lower.includes("configured") || lower.includes("supported") || lower.includes("does not accept"))) {
    return {
      title: `${name} model is misconfigured`,
      detail,
      tone: "warning",
    }
  }

  if (lower.includes("session expired") || (lower.includes("session") && lower.includes("not found"))) {
    return {
      title: "Session expired",
      detail,
      tone: "danger",
    }
  }

  return {
    title: `${name} could not respond`,
    detail,
    tone: "danger",
  }
}
