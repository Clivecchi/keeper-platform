import React, { useContext, useEffect, useState } from 'react';
import { BoardContext } from '../../boards/BoardContext';
import { apiFetch } from '../../lib/api';

type Task = {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dueAt?: string;
  linkedDraftId?: string;
  linkedTopicId?: string;
  createdAt: string;
  updatedAt: string;
};

export function TasksFrame({ agentId }: { agentId: string }) {
  const { currentTopicId } = useContext(BoardContext);
  const [items, setItems] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  async function load() {
    const params = currentTopicId ? `?topicId=${encodeURIComponent(currentTopicId)}` : '';
    const data = await apiFetch(`/api/agents/${agentId}/tasks${params}`);
    setItems(Array.isArray(data) ? data : (data.data || []));
  }

  useEffect(() => { load(); }, [agentId, currentTopicId]);

  async function create() {
    const res = await apiFetch(`/api/agents/${agentId}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        linkedTopicId: currentTopicId || undefined
      })
    });
    if (res?.success || res?.id) {
      setTitle('');
      await load();
    }
  }

  async function setStatus(id: string, status: Task['status']) {
    const res = await apiFetch(`/api/agents/${agentId}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res?.success) await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="border px-2 py-1 rounded" placeholder="New task…" value={title} onChange={e => setTitle(e.target.value)} />
        <button className="border px-3 py-1 rounded" onClick={create} disabled={!title.trim()}>Create</button>
      </div>
      <ul className="space-y-2">
        {items.map(t => (
          <li key={t.id} className="border rounded p-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs opacity-70">
                status: {t.status}{t.linkedTopicId ? ` • topic ${t.linkedTopicId}` : ''}{t.linkedDraftId ? ` • draft ${t.linkedDraftId}` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="border px-2 py-1 rounded" onClick={() => setStatus(t.id, 'in_progress')}>Start</button>
              <button className="border px-2 py-1 rounded" onClick={() => setStatus(t.id, 'completed')}>Complete</button>
              <button className="border px-2 py-1 rounded" onClick={() => setStatus(t.id, 'failed')}>Fail</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TasksFrame;


