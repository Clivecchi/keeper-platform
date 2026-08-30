import { displayKeeperStageTitle } from "@keeper/shared"

export type StageNowLine = {
  name: string
  text: string
}

export type StageNowBeatModel = {
  you: StageNowLine | null
  answer: StageNowLine | null
}

export type StageNowMessage = {
  role: "user" | "agent" | "system" | string
  content: string
  senderName?: string
}

function trimmedText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** Last human Turn and the Director reply after it. Not a transcript. */
export function resolveStageNowBeat(
  messages: ReadonlyArray<StageNowMessage>,
  names: { userName: string; agentName: string },
): StageNowBeatModel {
  let lastIndex = -1
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role === "system") continue
    if (!trimmedText(message.content)) continue
    lastIndex = i
    break
  }
  if (lastIndex < 0) return { you: null, answer: null }

  const last = messages[lastIndex]
  if (!last) return { you: null, answer: null }

  if (last.role === "user") {
    return {
      you: {
        name: last.senderName?.trim() || names.userName,
        text: trimmedText(last.content),
      },
      answer: null,
    }
  }

  const answer: StageNowLine | null =
    last.role === "agent"
      ? {
          name: last.senderName?.trim() || names.agentName,
          text: trimmedText(last.content),
        }
      : null

  let you: StageNowLine | null = null
  for (let i = lastIndex - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role !== "user") continue
    const text = trimmedText(message.content)
    if (!text) continue
    you = {
      name: message.senderName?.trim() || names.userName,
      text,
    }
    break
  }

  return { you, answer }
}

export function displayStageTitle(title: string, domainLabel?: string | null): string {
  return displayKeeperStageTitle(title, domainLabel)
}
