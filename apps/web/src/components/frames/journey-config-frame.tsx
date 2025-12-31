/**
 * Journey Config Frame
 * ====================
 * 
 * Config panel frame component for managing journey settings.
 * Provides tabbed interface for theme, permissions, and general settings.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cog6ToothIcon,
  PaintBrushIcon,
  UserGroupIcon,
  TagIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface JourneySettings {
  title: string;
  description: string;
  icon: string;
  tags: string[];
  visibility: 'public' | 'private' | 'shared';
  allowComments: boolean;
  allowCollaboration: boolean;
  requireApproval: boolean;
}

interface ThemeSettings {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  borderColor: string;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
  addedAt: Date;
}

const JourneyConfigFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);

  // Journey settings state
  const [settings, setSettings] = useState<JourneySettings>({
    title: 'Learning React Development',
    description: 'A comprehensive learning path for modern React development',
    icon: '🚀',
    tags: ['React', 'JavaScript', 'Frontend', 'Development'],
    visibility: 'public',
    allowComments: true,
    allowCollaboration: true,
    requireApproval: false,
  });

  // Theme settings state
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    accentColor: '#1E40AF',
    borderColor: '#BFDBFE',
  });

  // Collaborators state
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'owner',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      addedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'editor',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      addedAt: new Date('2024-01-20')
    }
  ]);

  const [newTag, setNewTag] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const handleConfigAction = (action: string, data?: any) => {
    const interaction = {
      type: 'submit' as const,
      frameId: frameInstance.id,
      data: { action, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleSaveSettings = () => {
    setIsEditing(false);
    handleConfigAction('journey_update', { settings, theme });
  };

  const handleAddTag = () => {
    if (newTag && !settings.tags.includes(newTag)) {
      setSettings(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleInviteCollaborator = () => {
    if (inviteEmail) {
      const newCollaborator: Collaborator = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: 'viewer',
        addedAt: new Date()
      };
      setCollaborators(prev => [...prev, newCollaborator]);
      setInviteEmail('');
      handleConfigAction('collaborator_invite', { email: inviteEmail });
    }
  };

  const predefinedThemes = [
    { name: 'Ocean Blue', primary: '#3B82F6', bg: '#EFF6FF', accent: '#1E40AF', border: '#BFDBFE' },
    { name: 'Forest Green', primary: '#059669', bg: '#F0FDF4', accent: '#047857', border: '#BBF7D0' },
    { name: 'Sunset Orange', primary: '#EA580C', bg: '#FFF7ED', accent: '#C2410C', border: '#FED7AA' },
    { name: 'Purple Dream', primary: '#7C3AED', bg: '#F5F3FF', accent: '#5B21B6', border: '#C4B5FD' },
  ];

  const tabs: FrameTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: <Cog6ToothIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <input
                  type="text"
                  value={settings.icon}
                  onChange={(e) => setSettings(prev => ({ ...prev, icon: e.target.value }))}
                  disabled={!isEditing}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 text-center text-lg"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Tags</h4>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {settings.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              
              {isEditing && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Visibility & Permissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Privacy & Permissions</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="space-y-2">
                  {[
                    { value: 'public', label: 'Public', desc: 'Anyone can view this journey', icon: <EyeIcon className="w-4 h-4" /> },
                    { value: 'shared', label: 'Shared', desc: 'Only invited collaborators can view', icon: <UserGroupIcon className="w-4 h-4" /> },
                    { value: 'private', label: 'Private', desc: 'Only you can view this journey', icon: <EyeSlashIcon className="w-4 h-4" /> }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={settings.visibility === option.value}
                        onChange={(e) => setSettings(prev => ({ ...prev, visibility: e.target.value as any }))}
                        disabled={!isEditing}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span className="text-sm font-medium text-gray-900">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.allowComments}
                    onChange={(e) => setSettings(prev => ({ ...prev, allowComments: e.target.checked }))}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">Allow comments on moments</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.allowCollaboration}
                    onChange={(e) => setSettings(prev => ({ ...prev, allowCollaboration: e.target.checked }))}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">Allow collaboration</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) => setSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                    disabled={!isEditing}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">Require approval for new moments</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'theme',
      label: 'Theme',
      icon: <PaintBrushIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Predefined Themes */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Predefined Themes</h4>
            <div className="grid grid-cols-2 gap-3">
              {predefinedThemes.map((presetTheme) => (
                <button
                  key={presetTheme.name}
                  onClick={() => setTheme({
                    primaryColor: presetTheme.primary,
                    backgroundColor: presetTheme.bg,
                    accentColor: presetTheme.accent,
                    borderColor: presetTheme.border
                  })}
                  className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: presetTheme.primary }}
                    />
                    <span className="text-sm font-medium text-gray-900">{presetTheme.name}</span>
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: presetTheme.primary }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: presetTheme.bg }} />
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: presetTheme.accent }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Custom Colors</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Preview</h5>
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.borderColor
                  }}
                >
                  <div 
                    className="text-white px-3 py-2 rounded-lg text-sm font-medium mb-2"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Primary Color Sample
                  </div>
                  <div 
                    className="text-white px-3 py-1 rounded text-xs"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Accent Color Sample
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'collaborators',
      label: 'Collaborators',
      icon: <UserGroupIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Invite Collaborators */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Invite Collaborators</h4>
            <div className="flex space-x-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleInviteCollaborator}
                disabled={!inviteEmail}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invite
              </button>
            </div>
          </div>

          {/* Current Collaborators */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Current Collaborators</h4>
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div key={collaborator.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden">
                      {collaborator.avatar ? (
                        <img src={collaborator.avatar} alt={collaborator.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{collaborator.name}</div>
                      <div className="text-xs text-gray-500">{collaborator.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={collaborator.role}
                      onChange={(e) => {
                        setCollaborators(prev => 
                          prev.map(c => 
                            c.id === collaborator.id 
                              ? { ...c, role: e.target.value as Collaborator['role'] }
                              : c
                          )
                        );
                      }}
                      disabled={collaborator.role === 'owner'}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    
                    {collaborator.role !== 'owner' && (
                      <button
                        onClick={() => setCollaborators(prev => prev.filter(c => c.id !== collaborator.id))}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
          <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Journey Config</h3>
        </div>
        <p className="text-sm text-gray-600">
          Configure journey settings, theme, and collaboration options.
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
            <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Journey Configuration</h3>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveSettings}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
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

export default JourneyConfigFrame;
