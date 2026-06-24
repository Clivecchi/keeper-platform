"use client";

import * as React from "react";
import { ActionReceiptCard } from "../../components/kip/ActionReceiptCard";
import { normalizeActionReceipt } from "../../components/agent/types";
import type { AgentDialogueMessage } from "../../components/agent/types";

export interface MobileKipChronicleViewProps {
  message: AgentDialogueMessage | null;
  agentName?: string;
  onOpenMoment?: (momentId: string) => void;
  onOpenJourney?: (journeyId: string) => void;
  onOpenDraft?: (draftId: string) => void;
}

export function MobileKipChronicleView({
  message,
  agentName = "Kip",
  onOpenMoment,
  onOpenJourney,
  onOpenDraft,
}: MobileKipChronicleViewProps) {
  const receipts = React.useMemo(() => {
    if (!message?.actionResults?.length) return [];
    return message.actionResults.map((result) =>
      normalizeActionReceipt(result as Parameters<typeof normalizeActionReceipt>[0]),
    );
  }, [message]);

  if (!message) {
    return (
      <div className="px-4 py-8 text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Chronicle view appears after Kip completes an action.
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Chronicle
        </p>
        <p
          className="mt-2 text-xs"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          What {agentName} did in this exchange
        </p>
      </div>

      {receipts.length > 0 ? (
        <div className="space-y-3">
          {receipts.map((receipt, index) => (
            <ActionReceiptCard
              key={`${receipt.type}-${index}`}
              receipt={receipt}
              onOpenMoment={onOpenMoment}
              onOpenJourney={onOpenJourney}
              onOpenDraft={onOpenDraft}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border px-4 py-4"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.4)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.5)",
          }}
        >
          <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            No structured actions in this reply — switch to Text for the full message.
          </p>
        </div>
      )}
    </div>
  );
}
