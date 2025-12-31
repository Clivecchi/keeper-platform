import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../features/board-studio/v0/components/ui/dialog';
import { Input } from '../../features/board-studio/v0/components/ui/input';
import { Textarea } from '../../features/board-studio/v0/components/ui/textarea';
import type { AgentConversationSession } from '../../hooks/useAgentSessions';

type SessionEditModalProps = {
  open: boolean;
  session: AgentConversationSession | null;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (updates: { session_name: string; summary?: string | null; tags?: any }) => Promise<void>;
};

const parseTagsInput = (value: string): any => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fallback: comma-separated list -> array of strings
    const items = trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    return items.length ? items : trimmed;
  }
};

export const SessionEditModal: React.FC<SessionEditModalProps> = ({
  open,
  session,
  isSaving = false,
  error,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const initialTags = useMemo(() => {
    if (!session?.tags) return '';
    try {
      return JSON.stringify(session.tags, null, 2);
    } catch {
      return '';
    }
  }, [session?.tags]);

  useEffect(() => {
    if (open && session) {
      console.log('[Kip] SessionEditModal open', { sessionId: session.id });
      setName(session.sessionName || session.title || '');
      setSummary(session.summary || '');
      setTagsInput(initialTags);
      setLocalError(null);
    }
  }, [open, session, initialTags]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLocalError('Name is required');
      return;
    }

    const parsedTags = parseTagsInput(tagsInput);
    setLocalError(null);
    console.log('[Kip] SessionEditModal save', { sessionId: session?.id, updates: { session_name: trimmedName, summary, tags: parsedTags } });

    try {
      await onSave({
        session_name: trimmedName,
        summary: summary.trim() || null,
        tags: parsedTags,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save session';
      setLocalError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
          <p className="text-sm text-gray-500">Update the session name, summary, or tags.</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="session-name">
              Name<span className="text-red-500">*</span>
            </label>
            <Input
              id="session-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Session with Kip"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="session-summary">
              Summary
            </label>
            <Textarea
              id="session-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="Short description or highlights for this session"
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="session-tags">
              Tags (JSON or comma-separated)
            </label>
            <Textarea
              id="session-tags"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder='e.g., ["alpha","beta"] or {"status":"open"} or alpha,beta'
              rows={3}
              disabled={isSaving}
            />
            <p className="text-xs text-gray-500">Accepts JSON arrays/objects or comma-separated strings.</p>
          </div>

          {(localError || error) && <p className="text-sm text-red-600">{localError || error}</p>}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-[#C96E59] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B85D4A] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

