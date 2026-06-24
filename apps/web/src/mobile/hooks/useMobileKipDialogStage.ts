import * as React from "react";
import type { AgentDialogueMessage } from "../../components/agent/types";

export type MobileKipDialogStage = "composing" | "thinking" | "response";

export type MobileKipResponseView = "text" | "chronicle";

export interface UseMobileKipDialogStageOptions {
  messages: AgentDialogueMessage[];
  input: string;
  isSending: boolean;
  composerFocused: boolean;
  hasAttachments?: boolean;
}

export function useMobileKipDialogStage({
  messages,
  input,
  isSending,
  composerFocused,
  hasAttachments = false,
}: UseMobileKipDialogStageOptions) {
  const [responseView, setResponseView] = React.useState<MobileKipResponseView>("text");

  const stage = React.useMemo<MobileKipDialogStage>(() => {
    if (isSending) return "thinking";
    if (composerFocused || input.trim().length > 0 || hasAttachments) return "composing";
    if (messages.length === 0) return "composing";
    return "response";
  }, [isSending, composerFocused, input, hasAttachments, messages.length]);

  const displayMessages = React.useMemo(() => {
    if (stage !== "response") return messages;
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return messages.slice(-2);
    return messages.slice(lastUserIndex);
  }, [messages, stage]);

  const latestAgentMessage = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "agent") return messages[i];
    }
    return null;
  }, [messages]);

  return {
    stage,
    responseView,
    setResponseView,
    displayMessages,
    latestAgentMessage,
  };
}
