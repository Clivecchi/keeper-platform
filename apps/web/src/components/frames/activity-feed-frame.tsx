/**
 * Activity Feed Frame
 * ===================
 * 
 * Media card frame component for displaying platform activity timeline.
 * Shows recent activities with filtering and interaction capabilities.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon } from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';
import { BoardContext } from '../../boards/BoardContext';

interface ActivityItem {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'join' | 'invite' | 'comment' | 'like' | 'share' | 'complete';
  actor: {
    id: string;
    name: string;
    avatar?: string;
  };
  target: {
    type: 'journey' | 'domain' | 'moment' | 'person' | 'role';
    id: string;
    name: string;
  };
  description: string;
  timestamp: Date;
  metadata?: {
    domain?: string;
    journey?: string;
    oldValue?: string;
    newValue?: string;
    commentText?: string;
  };
}

type ApiActivity = {
  id: string;
  kind: 'topic' | 'draft' | 'task';
  action: 'create' | 'update' | 'delete' | 'status';
  message: string;
  linkedIds?: { topicId?: string; draftId?: string; taskId?: string };
  actorId?: string;
  createdAt: string;
};

const ActivityFeedFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const { currentTopicId } = React.useContext(BoardContext);
  const agentId = frameInstance.entityId;
  const [items, setItems] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'' | 'topic' | 'draft' | 'task'>('');
  const [q, setQ] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  async function load(reset = true, cursor?: string | null) {
    const url = new URL(`/api/agents/${agentId}/activity`, window.location.origin);
    if (currentTopicId) url.searchParams.set('topicId', currentTopicId);
    if (typeFilter) url.searchParams.set('type', typeFilter);
    if (q.trim()) url.searchParams.set('q', q.trim());
    if (!reset && cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString(), { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setNextCursor(data.nextCursor ?? null);
    setItems(reset ? (data.items || []) : [...items, ...(data.items || [])]);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await load(true);
      } catch (e: any) {
        if (!ignore) setError(String(e?.message || e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, currentTopicId, typeFilter, q]);

  const getTimeAgo = (ts: string) => {
    const timestamp = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <ClockIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Activity Feed</h3>
        </div>
        <p className="text-sm text-gray-600">
          Real-time timeline of platform activities with filtering and interactions.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-gray-900">Activity Feed</h3>
            <span className="text-sm text-gray-500">({items.length} items)</span>
          </div>
          <div className="flex gap-2">
            <input
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search activity…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="topic">Topics</option>
              <option value="draft">Drafts</option>
              <option value="task">Tasks</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="p-4 space-y-2">
        {error && (
          <div className="p-2 border border-red-200 bg-red-50 text-red-700 rounded text-sm">{error}</div>
        )}
        {items.map((a) => (
          <div key={a.id} className="p-3 border rounded">
            <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()} · {getTimeAgo(a.createdAt)}</div>
            <div className="font-medium capitalize">{a.kind} · {a.action}</div>
            <div className="text-sm">{a.message}</div>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-gray-500">Loading…</div>
        )}
        {nextCursor && !loading && (
          <button
            className="mt-2 border px-3 py-1 rounded text-sm"
            onClick={() => load(false, nextCursor)}
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
};

export default ActivityFeedFrame;
