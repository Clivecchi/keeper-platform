/**
 * People Overview Frame
 * =====================
 * 
 * Preview frame component for displaying comprehensive people overview.
 * Shows people list with filtering, search, and management capabilities.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface Person {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'active' | 'pending' | 'inactive' | 'suspended';
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  lastActivity: Date;
  domains: string[];
  journeys: string[];
  totalContributions: number;
  isOnline: boolean;
}

const PeopleOverviewFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Person['status']>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Person['role']>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock people data
  const [people] = useState<Person[]>([
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      status: 'active',
      role: 'owner',
      joinedAt: new Date('2024-01-10'),
      lastActivity: new Date('2024-01-28T14:30:00'),
      domains: ['Tech Domain', 'Marketing Domain'],
      journeys: ['React Development', 'Team Leadership'],
      totalContributions: 156,
      isOnline: true
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      status: 'active',
      role: 'admin',
      joinedAt: new Date('2024-01-15'),
      lastActivity: new Date('2024-01-28T10:15:00'),
      domains: ['Tech Domain'],
      journeys: ['Node.js Backend', 'DevOps Practices'],
      totalContributions: 89,
      isOnline: false
    },
    {
      id: '3',
      name: 'Carol Williams',
      email: 'carol@example.com',
      status: 'pending',
      role: 'member',
      joinedAt: new Date('2024-01-25'),
      lastActivity: new Date('2024-01-25T09:00:00'),
      domains: ['Marketing Domain'],
      journeys: [],
      totalContributions: 0,
      isOnline: false
    },
    {
      id: '4',
      name: 'David Brown',
      email: 'david@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      status: 'active',
      role: 'member',
      joinedAt: new Date('2024-01-20'),
      lastActivity: new Date('2024-01-27T16:45:00'),
      domains: ['Tech Domain', 'Design Domain'],
      journeys: ['UI/UX Design', 'React Development'],
      totalContributions: 45,
      isOnline: true
    },
    {
      id: '5',
      name: 'Eve Davis',
      email: 'eve@example.com',
      status: 'inactive',
      role: 'viewer',
      joinedAt: new Date('2024-01-05'),
      lastActivity: new Date('2024-01-20T12:00:00'),
      domains: ['Marketing Domain'],
      journeys: ['Content Strategy'],
      totalContributions: 12,
      isOnline: false
    }
  ]);

  const getStatusColor = (status: Person['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'suspended':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRoleColor = (role: Person['role']) => {
    switch (role) {
      case 'owner':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'admin':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'member':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'viewer':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: Person['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      case 'inactive':
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
      case 'suspended':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const handlePersonAction = (action: string, personId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, personId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const filteredPeople = people.filter(person => {
    const name = (person.name ?? '').toString().toLowerCase();
    const email = (person.email ?? '').toString().toLowerCase();
    const query = (searchTerm ?? '').toString().toLowerCase();
    const matchesSearch = name.includes(query) ||
                         email.includes(query) ||
                         (person.domains || []).some(domain => (domain ?? '').toString().toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    const matchesRole = roleFilter === 'all' || person.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const statusCounts = {
    active: people.filter(p => p.status === 'active').length,
    pending: people.filter(p => p.status === 'pending').length,
    inactive: people.filter(p => p.status === 'inactive').length,
    suspended: people.filter(p => p.status === 'suspended').length,
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <UserGroupIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">People Overview</h3>
        </div>
        <p className="text-sm text-gray-600">
          Comprehensive view of all people with filtering and management capabilities.
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
            <UserGroupIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-medium text-gray-900">People Overview</h3>
            <span className="text-sm text-gray-500">({people.length} total)</span>
          </div>
          <button
            onClick={() => handlePersonAction('person_invite')}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Invite Person</span>
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">{statusCounts.active}</div>
            <div className="text-xs text-green-700">Active</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="text-lg font-semibold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-xs text-yellow-700">Pending</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-600">{statusCounts.inactive}</div>
            <div className="text-xs text-gray-700">Inactive</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{statusCounts.suspended}</div>
            <div className="text-xs text-red-700">Suspended</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </div>

      {/* People List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredPeople.map((person, index) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        {person.avatar ? (
                          <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {person.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    {/* Person Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{person.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(person.status)}`}>
                          {getStatusIcon(person.status)}
                          <span className="ml-1 capitalize">{person.status}</span>
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(person.role)}`}>
                          {person.role === 'owner' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{person.role}</span>
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{person.email}</p>

                      {/* Domains and Journeys */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Domains:</span>
                          <span>{person.domains.length > 0 ? person.domains.join(', ') : 'None'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Journeys:</span>
                          <span>{person.journeys.length}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">Contributions:</span>
                          <span>{person.totalContributions}</span>
                        </div>
                      </div>

                      {/* Activity Info */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="w-3 h-3" />
                          <span>Joined {person.joinedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>Last active: {person.lastActivity.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handlePersonAction('person_view', person.id)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="View Person"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePersonAction('person_edit', person.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Person"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    {person.status === 'pending' && (
                      <button
                        onClick={() => handlePersonAction('person_resend_invite', person.id)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Resend Invite"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                      </button>
                    )}
                    {person.role !== 'owner' && (
                      <button
                        onClick={() => handlePersonAction('person_remove', person.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove Person"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredPeople.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' ? 'No matching people' : 'No people found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Start by inviting people to join your platform.'
              }
            </p>
            <button
              onClick={() => handlePersonAction('person_invite')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Invite Your First Person</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredPeople.length} of {people.length} people
          </span>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">
              {people.filter(p => p.isOnline).length} online
            </span>
            <button
              onClick={() => handlePersonAction('people_export')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Export List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleOverviewFrame;
