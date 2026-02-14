/**
 * Action Receipt Card Component
 * ==============================
 * 
 * Renders a standardized action execution receipt in the chat UI.
 * Handles success/error/skipped states with appropriate styling.
 */

import React from 'react';

export interface ActionReceipt {
  type: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  errorCode?: string;
  data?: {
    entityIds?: string[];
    draft?: { id: string; title: string; kind: string; key: string };
    links?: { open?: string; edit?: string };
    [key: string]: unknown;
  };
}

export interface ActionReceiptCardProps {
  receipt: ActionReceipt;
  onOpenDraft?: (draftId: string) => void;
}

/**
 * Get a human-readable label from action type
 */
function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    'draft.create': 'Created',
    'draft.update': 'Updated',
    'draft.delete': 'Deleted',
    'draft.setActive': 'Set active',
    'draft.list': 'Listed',
    'draft.get': 'Retrieved',
    'draft.read': 'Retrieved',
    'draft.update.propose': 'Proposed update',
    'sole.save': 'Memory saved',
  };
  return labels[actionType] || 'Completed';
}

export const ActionReceiptCard: React.FC<ActionReceiptCardProps> = ({ receipt, onOpenDraft }) => {
  const { type, status, message, errorCode, data } = receipt;
  const draft = data?.draft;
  const openUrl = data?.links?.open;
  const memoryCard = data?.memoryCard as { id?: string } | undefined;
  const reflection = data?.reflection as { id?: string } | undefined;
  const isSoleSave = type === 'sole.save';

  // Success state
  if (status === 'success') {
    const actionLabel = getActionLabel(type);
    
    return (
      <div
        className="rounded-lg border p-3"
        style={{
          borderColor: 'var(--theme-dialogue-border, hsl(35, 20%, 88%))',
          backgroundColor: 'var(--theme-dialogue-area-bg, hsl(35, 33%, 97%))',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-700">
              ✓ {actionLabel}
              {draft?.title && `: ${draft.title}`}
            </p>
            {message && (draft?.title || isSoleSave) && message !== `Draft ${actionLabel.toLowerCase()} successfully` && (
              <p className="mt-1 text-xs text-gray-600">{message}</p>
            )}
            {!draft?.title && !isSoleSave && message && (
              <p className="mt-1 text-xs text-gray-600">{message}</p>
            )}
            {isSoleSave && (memoryCard || reflection) && (
              <p className="mt-0.5 text-xs text-gray-500">
                SOLE memory card recorded
              </p>
            )}
            {draft && (
              <p className="mt-0.5 text-xs text-gray-500">
                {draft.kind} • {draft.key}
              </p>
            )}
          </div>
        </div>
        {openUrl && onOpenDraft && draft && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onOpenDraft(draft.id)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--theme-dialogue-user-bg, hsl(14, 60%, 56%))' }}
            >
              View Draft →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-xs font-semibold text-red-800">✗ Failed</p>
        <p className="mt-1 text-sm text-red-700">{message}</p>
        {errorCode && (
          <p className="mt-1 text-xs text-red-600">Error code: {errorCode}</p>
        )}
      </div>
    );
  }

  // Skipped state
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-600">⊘ Skipped</p>
      <p className="mt-1 text-sm text-gray-600">{message}</p>
    </div>
  );
};

