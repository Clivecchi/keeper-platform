/**
 * Member List Frame
 * =================
 * 
 * Config panel frame component for managing domain members and permissions.
 * Supports member invitation, role assignment, and access management.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface DomainMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'inactive';
  avatar?: string;
  joinedAt: Date;
  lastActive?: Date;
}

interface InviteForm {
  email: string;
  role: DomainMember['role'];
  message: string;
}

const MemberListFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState('members');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    email: '',
    role: 'member',
    message: ''
  });

  // Mock members data
  const [members, setMembers] = useState<DomainMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      joinedAt: new Date('2024-01-15'),
      lastActive: new Date()
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'admin',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      joinedAt: new Date('2024-01-20'),
      lastActive: new Date(Date.now() - 86400000) // 1 day ago
    },
    {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'member',
      status: 'invited',
      joinedAt: new Date('2024-02-01'),
    },
  ]);

  const getRoleColor = (role: DomainMember['role']) => {
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

  const getStatusColor = (status: DomainMember['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'invited':
        return 'text-yellow-600';
      case 'inactive':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleInviteMember = () => {
    if (!inviteForm.email) return;

    const newMember: DomainMember = {
      id: Date.now().toString(),
      name: inviteForm.email.split('@')[0],
      email: inviteForm.email,
      role: inviteForm.role,
      status: 'invited',
      joinedAt: new Date(),
    };

    setMembers(prev => [...prev, newMember]);
    setInviteForm({ email: '', role: 'member', message: '' });
    setIsInviting(false);

    const interaction = {
      type: 'submit' as const,
      frameId: frameInstance.id,
      data: { 
        action: 'member_invite',
        email: inviteForm.email,
        role: inviteForm.role 
      },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action: 'member_remove', memberId },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const tabs: FrameTab[] = [
    {
      id: 'members',
      label: 'Members',
      icon: <UserGroupIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {/* Invite Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-blue-900">Invite Team Members</h4>
              <button
                onClick={() => setIsInviting(!isInviting)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                <span>Invite</span>
              </button>
            </div>

            <AnimatePresence>
              {isInviting && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as DomainMember['role'] }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleInviteMember}
                      disabled={!inviteForm.email}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                      <span>Send Invite</span>
                    </button>
                    <button
                      onClick={() => setIsInviting(false)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Members List */}
          <div className="space-y-3">
            <AnimatePresence>
              {members.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{member.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      {member.lastActive && (
                        <p className="text-xs text-gray-400">
                          Last active: {member.lastActive.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Role Badge */}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                      {member.role === 'owner' && <ShieldCheckIcon className="w-3 h-3 mr-1" />}
                      <span className="capitalize">{member.role}</span>
                    </span>

                    {/* Status */}
                    <div className={`text-xs font-medium ${getStatusColor(member.status)}`}>
                      {member.status === 'active' && <CheckIcon className="w-4 h-4" />}
                      {member.status === 'invited' && <EnvelopeIcon className="w-4 h-4" />}
                      {member.status === 'inactive' && <XMarkIcon className="w-4 h-4" />}
                    </div>

                    {/* Actions */}
                    {member.role !== 'owner' && (
                      <div className="flex items-center space-x-1">
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <ShieldCheckIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Role Permissions</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium text-purple-600">Owner</span>
                <span className="text-gray-600">Full access to all features</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-600">Admin</span>
                <span className="text-gray-600">Manage members and settings</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-green-600">Member</span>
                <span className="text-gray-600">Create and edit content</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Viewer</span>
                <span className="text-gray-600">Read-only access</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <UserGroupIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Member List</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage domain members, roles, and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Team Management</h3>
          </div>
          <div className="text-sm text-gray-600">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {tab.icon}
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs.find(tab => tab.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MemberListFrame;
