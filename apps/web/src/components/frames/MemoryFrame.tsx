import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type MemoryItem = { id: string; text: string; createdAt: string };
type PinnedNote = { id: string; text: string; pinnedAt: string };

export interface MemoryFrameProps {
  agentId: string;
  limit?: number;
}

export function MemoryFrame({ agentId, limit = 20 }: MemoryFrameProps) {
  const [pinnedNotes, setPinnedNotes] = useState<PinnedNote[]>([]);
  const [recentLearnings, setRecentLearnings] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await apiFetch(`/api/agents/${agentId}/memory?limit=${limit}`);
        if (!ignore) {
          setPinnedNotes(Array.isArray(data.pinnedNotes) ? data.pinnedNotes : []);
          setRecentLearnings(Array.isArray(data.recentLearnings) ? data.recentLearnings : []);
        }
      } catch (e: any) {
        if (!ignore) setErr(String(e?.message || e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [agentId, limit]);

  if (loading) return <div>Loading memory…</div>;
  if (err) return <div role="alert">Memory failed to load: {err}</div>;

  return (
    <div className="space-y-4">
      <section>
        <h2 className="font-medium">Pinned Notes</h2>
        {pinnedNotes.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pinned notes yet.</div>
        ) : (
          <ul className="list-disc pl-5">
            {pinnedNotes.map(p => <li key={p.id}>{p.text}</li>)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-medium">Recent Learnings</h2>
        {recentLearnings.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent learnings.</div>
        ) : (
          <ul className="list-disc pl-5">
            {recentLearnings.map(m => <li key={m.id}>{m.text}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
