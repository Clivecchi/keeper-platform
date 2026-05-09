"use client"

import * as React from "react"
import { useAgentDialog } from "../../../hooks/useAgentDialog"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"

// ─── Props ────────────────────────────────────────────────────────────────────

interface DomainBoardConversationProps {
  domainSlug: string
  /** Resolved domain ID — passed through to agent context. */
  domainId?: string | null
  /** Domain display name shown in the banner. */
  wordmark?: string | null
  /** Moment count badge shown in banner secondary slot (optional). */
  momentCount?: number | null
  /** Journey count badge shown in banner secondary slot (optional). */
  journeyCount?: number | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DomainBoardConversation({
  domainSlug,
  domainId,
  wordmark,
}: DomainBoardConversationProps) {
  const { resolvedAudience } = useV0Shell()

  const {
    messages,
    input,
    setInput,
    isSending,
    error,
    agentId,
    activeSessionId,
    sendMessage,
  } = useAgentDialog({
    agentSlug: "kip",
    agentDisplayName: "Kip",
    mode: "domain",
    dialogBoard: "domain",
    dialogFrame: "conversation",
    dialogSubject: "domain",
    domainSlug,
    domainId,
    resolvedAudience: resolvedAudience ?? "keeper",
  })

  return (
    <KeeperDialogFrame
      bannerContext={{ primary: wordmark || domainSlug || "Domain" }}
      showServiceBar={false}
      messages={messages}
      isSending={isSending}
      error={error}
      agentName="Kip"
      agentBubbleFullWidth={false}
      agentId={agentId}
      domainId={domainId ?? null}
      dialogueMode="domain"
      inputValue={input}
      onInputChange={setInput}
      onSubmit={sendMessage}
      onFileAttach={(text) => setInput((prev) => (prev ? `${prev}\n\n${text}` : text))}
      activeSessionId={activeSessionId}
      disabled={!agentId}
    />
  )
}
