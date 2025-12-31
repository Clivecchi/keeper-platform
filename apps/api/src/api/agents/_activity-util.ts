export type ActivityKind = 'topic' | 'draft' | 'task';
export type ActivityAction = 'create' | 'update' | 'delete' | 'status';

export type ActivityRow = {
  id: string;
  agentId: string;
  kind: ActivityKind;
  action: ActivityAction;
  message: string;
  meta?: Record<string, any>;
  linkedIds?: { topicId?: string; draftId?: string; taskId?: string };
  actorId?: string;
  createdAt: string;
};

const mem: Record<string, ActivityRow[]> = {};

export function emitActivity(e: Omit<ActivityRow, 'id' | 'createdAt'>) {
  const row: ActivityRow = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    ...e,
  };
  (mem[e.agentId] ||= []).unshift(row);
}

export function readActivity(opts: {
  agentId: string;
  topicId?: string;
  type?: ActivityKind;
  q?: string;
  cursor?: string | null;
  limit?: number;
}) {
  const { agentId, topicId, type, q, cursor, limit = 25 } = opts;
  const all = mem[agentId] ?? [];
  const afterTs = cursor ? Number(cursor.split('_')[0]) : undefined;

  let filtered = all.filter((r) => {
    if (type && r.kind !== type) return false;
    if (topicId && r.linkedIds?.topicId !== topicId) return false;
    if (q && !r.message.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (afterTs) filtered = filtered.filter((r) => Number(r.id.split('_')[0]) < afterTs);

  const items = filtered.slice(0, limit);
  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  return { items, nextCursor };
}



