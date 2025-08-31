/**
 * Activity Feed Frame
 * ===================
 * 
 * Media card frame component for displaying platform activity timeline.
 * Shows recent activities with filtering and interaction capabilities.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon,
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  HeartIcon,
  ArrowRightIcon,
  FunnelIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
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

const ActivityFeedFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const { currentTopicId } = React.useContext(BoardContext);
  const agentId = frameInstance.entityId;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const url = new URL(`/api/agents/${agentId}/activity`, window.location.origin);
        if (currentTopicId) url.searchParams.set('topicId', currentTopicId);
        const res = await fetch(url.toString(), { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) setItems(Array.isArray(data) ? data : (data.data || []));
      } catch (e: any) {
        if (!ignore) setError(String(e?.message || e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [agentId, currentTopicId]);

  const [filterType, setFilterType] = useState<'all' | ActivityItem['type']>('all');
  const [filterPerson, setFilterPerson] = useState<'all' | string>('all');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Mock activity data
  // const [activities] = useState<ActivityItem[]>([
  //   {
  //     id: '1',
  //     type: 'create',
  //     actor: {
  //       id: 'alice',
  //       name: 'Alice Johnson',
  //       avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'journey',
  //       id: 'react-advanced',
  //       name: 'Advanced React Patterns'
  //     },
  //     description: 'Created a new journey "Advanced React Patterns"',
  //     timestamp: new Date('2024-01-28T14:30:00'),
  //     metadata: {
  //       domain: 'Tech Domain'
  //     }
  //   },
  //   {
  //     id: '2',
  //     type: 'invite',
  //     actor: {
  //       id: 'bob',
  //       name: 'Bob Smith',
  //       avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'person',
  //       id: 'eve',
  //       name: 'Eve Davis'
  //     },
  //     description: 'Invited Eve Davis to join Tech Domain',
  //     timestamp: new Date('2024-01-28T13:15:00'),
  //     metadata: {
  //       domain: 'Tech Domain'
  //     }
  //   },
  //   {
  //     id: '3',
  //     type: 'comment',
  //     actor: {
  //       id: 'david',
  //       name: 'David Brown',
  //       avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'moment',
  //       id: 'react-hooks-moment',
  //       name: 'React Hooks Tutorial'
  //     },
  //     description: 'Commented on "React Hooks Tutorial"',
  //     timestamp: new Date('2024-01-28T12:45:00'),
  //     metadata: {
  //       journey: 'React Development',
  //       commentText: 'Great explanation of useEffect!'
  //     }
  //   },
  //   {
  //     id: '4',
  //     type: 'edit',
  //     actor: {
  //       id: 'alice',
  //       name: 'Alice Johnson',
  //       avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'role',
  //       id: 'member-role',
  //       name: 'Member Role'
  //     },
  //     description: 'Updated permissions for Member Role',
  //     timestamp: new Date('2024-01-28T11:30:00'),
  //     metadata: {
  //       oldValue: 'Basic permissions',
  //       newValue: 'Added content creation permissions'
  //     }
  //   },
  //   {
  //     id: '5',
  //     type: 'complete',
  //     actor: {
  //       id: 'carol',
  //       name: 'Carol Williams'
  //     },
  //     target: {
  //       type: 'journey',
  //       id: 'content-strategy',
  //       name: 'Content Strategy Basics'
  //     },
  //     description: 'Completed "Content Strategy Basics" journey',
  //     timestamp: new Date('2024-01-28T10:15:00'),
  //     metadata: {
  //       domain: 'Marketing Domain'
  //     }
  //   },
  //   {
  //     id: '6',
  //     type: 'join',
  //     actor: {
  //       id: 'frank',
  //       name: 'Frank Wilson'
  //     },
  //     target: {
  //       type: 'domain',
  //       id: 'design-domain',
  //       name: 'Design Domain'
  //     },
  //     description: 'Joined Design Domain',
  //     timestamp: new Date('2024-01-28T09:00:00')
  //   },
  //   {
  //     id: '7',
  //     type: 'like',
  //     actor: {
  //       id: 'david',
  //       name: 'David Brown',
  //       avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'moment',
  //       id: 'ui-patterns',
  //       name: 'UI Design Patterns'
  //     },
  //     description: 'Liked "UI Design Patterns"',
  //     timestamp: new Date('2024-01-27T16:45:00'),
  //     metadata: {
  //       journey: 'UI/UX Design'
  //     }
  //   },
  //   {
  //     id: '8',
  //     type: 'share',
  //     actor: {
  //       id: 'bob',
  //       name: 'Bob Smith',
  //       avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  //     },
  //     target: {
  //       type: 'journey',
  //       id: 'devops-journey',
  //       name: 'DevOps Best Practices'
  //     },
  //     description: 'Shared "DevOps Best Practices" journey',
  //     timestamp: new Date('2024-01-27T15:20:00')
  //   }
  // ]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'create':
        return <PlusIcon className="w-4 h-4 text-green-500" />;
      case 'edit':
        return <PencilIcon className="w-4 h-4 text-blue-500" />;
      case 'delete':
        return <TrashIcon className="w-4 h-4 text-red-500" />;
      case 'join':
        return <ArrowRightIcon className="w-4 h-4 text-purple-500" />;
      case 'invite':
        return <UserIcon className="w-4 h-4 text-indigo-500" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="w-4 h-4 text-orange-500" />;
      case 'like':
        return <HeartIcon className="w-4 h-4 text-pink-500" />;
      case 'share':
        return <ShareIcon className="w-4 h-4 text-cyan-500" />;
      case 'complete':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'create':
        return 'border-green-200 bg-green-50';
      case 'edit':
        return 'border-blue-200 bg-blue-50';
      case 'delete':
        return 'border-red-200 bg-red-50';
      case 'join':
        return 'border-purple-200 bg-purple-50';
      case 'invite':
        return 'border-indigo-200 bg-indigo-50';
      case 'comment':
        return 'border-orange-200 bg-orange-50';
      case 'like':
        return 'border-pink-200 bg-pink-50';
      case 'share':
        return 'border-cyan-200 bg-cyan-50';
      case 'complete':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const handleActivityAction = (action: string, activityId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, activityId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  const filteredActivities = items.filter(activity => {
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesPerson = filterPerson === 'all' || activity.actor.id === filterPerson;
    
    let matchesTime = true;
    if (timeRange !== 'all') {
      const now = new Date();
      const activityDate = activity.timestamp;
      const diffDays = Math.floor((now.getTime() - activityDate.getTime()) / 86400000);
      
      switch (timeRange) {
        case 'today':
          matchesTime = diffDays === 0;
          break;
        case 'week':
          matchesTime = diffDays <= 7;
          break;
        case 'month':
          matchesTime = diffDays <= 30;
          break;
      }
    }
    
    return matchesType && matchesPerson && matchesTime;
  });

  const uniqueActors = Array.from(new Set(items.map(a => a.actor.id)))
    .map(id => items.find(a => a.actor.id === id)?.actor)
    .filter(Boolean);

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
            <span className="text-sm text-gray-500">({items.length} activities)</span>
          </div>
          <button
            onClick={() => handleActivityAction('activity_refresh')}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <ClockIcon className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Activities</option>
              <option value="create">Created</option>
              <option value="edit">Edited</option>
              <option value="delete">Deleted</option>
              <option value="join">Joined</option>
              <option value="invite">Invited</option>
              <option value="comment">Commented</option>
              <option value="like">Liked</option>
              <option value="share">Shared</option>
              <option value="complete">Completed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <UserIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All People</option>
              {uniqueActors.map((actor) => (
                <option key={actor!.id} value={actor!.id}>{actor!.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  {/* Activity Icon */}
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Actor Info */}
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                            {activity.actor.avatar ? (
                              <img src={activity.actor.avatar} alt={activity.actor.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserIcon className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{activity.actor.name}</span>
                          <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                        </div>

                        {/* Activity Description */}
                        <p className="text-sm text-gray-700 mb-2">{activity.description}</p>

                        {/* Metadata */}
                        {activity.metadata && (
                          <div className="space-y-1">
                            {activity.metadata.domain && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Domain:</span> {activity.metadata.domain}
                              </div>
                            )}
                            {activity.metadata.journey && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Journey:</span> {activity.metadata.journey}
                              </div>
                            )}
                            {activity.metadata.commentText && (
                              <div className="text-xs text-gray-600 bg-gray-100 rounded p-2 mt-1">
                                "{activity.metadata.commentText}"
                              </div>
                            )}
                            {activity.metadata.oldValue && activity.metadata.newValue && (
                              <div className="text-xs text-gray-600">
                                <span className="line-through">{activity.metadata.oldValue}</span> → {activity.metadata.newValue}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1 ml-4">
                        <button
                          onClick={() => handleActivityAction('activity_view', activity.id)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {activity.target.type === 'moment' && (
                          <button
                            onClick={() => handleActivityAction('activity_comment', activity.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Comment"
                          >
                            <ChatBubbleLeftIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
            <p className="text-gray-600 mb-4">
              {filterType !== 'all' || filterPerson !== 'all' || timeRange !== 'all'
                ? 'Try adjusting your filters to see more activities.'
                : 'Activities will appear here as people interact with the platform.'
              }
            </p>
            <button
              onClick={() => {
                setFilterType('all');
                setFilterPerson('all');
                setTimeRange('all');
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ClockIcon className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredActivities.length} of {items.length} activities
          </span>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleActivityAction('activity_export')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Export Feed
            </button>
            <button
              onClick={() => handleActivityAction('activity_settings')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Notification Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityFeedFrame;
