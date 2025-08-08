/**
 * Keeper Type Config Frame
 * =========================
 * 
 * Config panel frame component for editing Keeper Type settings.
 * Provides tabbed interface for basic info, capabilities, and advanced settings.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cog6ToothIcon,
  InformationCircleIcon,
  CpuChipIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  SparklesIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  SwatchIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps, FrameTab } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface KeeperTypeSettings {
  name: string;
  description: string;
  icon: string;
  category: string;
  version: string;
  status: 'active' | 'draft' | 'deprecated' | 'beta';
  capabilities: string[];
  tags: string[];
  isPublic: boolean;
  allowCustomization: boolean;
  requiresApproval: boolean;
}

interface ThemeSettings {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  borderColor: string;
}

const KeeperTypeConfigFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState('basic');
  const [isEditing, setIsEditing] = useState(false);

  // Keeper type settings state
  const [settings, setSettings] = useState<KeeperTypeSettings>({
    name: 'DevKeeper',
    description: 'Specialized AI assistant for software development and coding tasks',
    icon: '🚀',
    category: 'Development',
    version: '2.1.0',
    status: 'active',
    capabilities: ['Code Generation', 'Debugging', 'Architecture Review', 'Testing', 'Documentation'],
    tags: ['Development', 'AI', 'Coding', 'Assistant'],
    isPublic: true,
    allowCustomization: true,
    requiresApproval: false,
  });

  // Theme settings state
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    accentColor: '#B45309',
    borderColor: '#FED7AA',
  });

  const [newCapability, setNewCapability] = useState('');
  const [newTag, setNewTag] = useState('');

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
    handleConfigAction('keeper_type_update', { settings, theme });
  };

  const handleAddCapability = () => {
    if (newCapability && !settings.capabilities.includes(newCapability)) {
      setSettings(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, newCapability]
      }));
      setNewCapability('');
    }
  };

  const handleRemoveCapability = (capabilityToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(cap => cap !== capabilityToRemove)
    }));
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

  const predefinedThemes = [
    { name: 'Amber Gold', primary: '#F59E0B', bg: '#FFFBEB', accent: '#B45309', border: '#FED7AA' },
    { name: 'Ocean Blue', primary: '#3B82F6', bg: '#EFF6FF', accent: '#1E40AF', border: '#BFDBFE' },
    { name: 'Forest Green', primary: '#059669', bg: '#F0FDF4', accent: '#047857', border: '#BBF7D0' },
    { name: 'Purple Dream', primary: '#7C3AED', bg: '#F5F3FF', accent: '#5B21B6', border: '#C4B5FD' },
  ];

  const categoryOptions = [
    'Development',
    'Business',
    'Commerce',
    'Research',
    'Education',
    'Creative',
    'Analytics',
    'Support'
  ];

  const tabs: FrameTab[] = [
    {
      id: 'basic',
      label: 'Basic Info',
      icon: <InformationCircleIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input
                    type="text"
                    value={settings.version}
                    onChange={(e) => setSettings(prev => ({ ...prev, version: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input
                    type="text"
                    value={settings.icon}
                    onChange={(e) => setSettings(prev => ({ ...prev, icon: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50 text-center text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={settings.category}
                    onChange={(e) => setSettings(prev => ({ ...prev, category: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  >
                    {categoryOptions.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={settings.status}
                    onChange={(e) => setSettings(prev => ({ ...prev, status: e.target.value as KeeperTypeSettings['status'] }))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50"
                  >
                    <option value="draft">Draft</option>
                    <option value="beta">Beta</option>
                    <option value="active">Active</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
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
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-amber-600 hover:text-amber-800"
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
                    className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'capabilities',
      label: 'Capabilities',
      icon: <CpuChipIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Keeper Capabilities</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {settings.capabilities.map((capability, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-2">
                      <SparklesIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">{capability}</span>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveCapability(capability)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {isEditing && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCapability}
                    onChange={(e) => setNewCapability(e.target.value)}
                    placeholder="Add capability"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCapability()}
                  />
                  <button
                    onClick={handleAddCapability}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Capability Categories */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Suggested Capabilities</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                'Code Generation',
                'Debugging',
                'Testing',
                'Documentation',
                'Code Review',
                'Refactoring',
                'API Design',
                'Database Design',
                'Security Analysis',
                'Performance Optimization',
                'Architecture Planning',
                'DevOps Integration'
              ].filter(cap => !settings.capabilities.includes(cap)).map((capability) => (
                <button
                  key={capability}
                  onClick={() => isEditing && setSettings(prev => ({ ...prev, capabilities: [...prev.capabilities, capability] }))}
                  disabled={!isEditing}
                  className="p-2 text-left text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-amber-50 hover:border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PlusIcon className="w-3 h-3 inline mr-1" />
                  {capability}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: <AdjustmentsHorizontalIcon className="w-4 h-4" />,
      content: (
        <div className="space-y-6">
          {/* Access & Permissions */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Access & Permissions</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.isPublic}
                  onChange={(e) => setSettings(prev => ({ ...prev, isPublic: e.target.checked }))}
                  disabled={!isEditing}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-900">Public Keeper Type</span>
                  <p className="text-xs text-gray-500">Allow other users to discover and use this Keeper Type</p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.allowCustomization}
                  onChange={(e) => setSettings(prev => ({ ...prev, allowCustomization: e.target.checked }))}
                  disabled={!isEditing}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-900">Allow Customization</span>
                  <p className="text-xs text-gray-500">Users can modify this Keeper Type for their own use</p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.requiresApproval}
                  onChange={(e) => setSettings(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                  disabled={!isEditing}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm text-gray-900">Requires Approval</span>
                  <p className="text-xs text-gray-500">New instances need approval before activation</p>
                </div>
              </label>
            </div>
          </div>

          {/* Theme Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Theme Settings</h4>
            
            {/* Predefined Themes */}
            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Predefined Themes</h5>
              <div className="grid grid-cols-2 gap-2">
                {predefinedThemes.map((presetTheme) => (
                  <button
                    key={presetTheme.name}
                    onClick={() => isEditing && setTheme({
                      primaryColor: presetTheme.primary,
                      backgroundColor: presetTheme.bg,
                      accentColor: presetTheme.accent,
                      borderColor: presetTheme.border
                    })}
                    disabled={!isEditing}
                    className="p-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-200"
                        style={{ backgroundColor: presetTheme.primary }}
                      />
                      <span className="text-xs font-medium text-gray-900">{presetTheme.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: presetTheme.primary }} />
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: presetTheme.bg }} />
                      <div className="w-4 h-4 rounded border" style={{ backgroundColor: presetTheme.accent }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">Custom Colors</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      disabled={!isEditing}
                      className="w-8 h-6 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Accent Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                      disabled={!isEditing}
                      className="w-8 h-6 border border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed"
                    />
                    <input
                      type="text"
                      value={theme.accentColor}
                      onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                      disabled={!isEditing}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <h6 className="text-xs font-medium text-gray-900 mb-2">Preview</h6>
                <div 
                  className="p-3 rounded-lg border"
                  style={{ 
                    backgroundColor: theme.backgroundColor,
                    borderColor: theme.borderColor
                  }}
                >
                  <div 
                    className="text-white px-2 py-1 rounded text-xs font-medium mb-1"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    Primary Color
                  </div>
                  <div 
                    className="text-white px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: theme.accentColor }}
                  >
                    Accent Color
                  </div>
                </div>
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
          <Cog6ToothIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Keeper Type Config</h3>
        </div>
        <p className="text-sm text-gray-600">
          Configure Keeper Type settings, capabilities, and advanced options.
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
            <Cog6ToothIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-gray-900">Keeper Type Configuration</h3>
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
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
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
                  ? 'border-amber-500 text-amber-600'
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

export default KeeperTypeConfigFrame;
