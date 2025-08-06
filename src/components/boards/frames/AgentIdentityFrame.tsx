/**
 * AgentIdentityFrame Component
 * 
 * Frame for configuring agent identity information including name, avatar, and description.
 * Used in Agent Board for agent creation and configuration.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FrameProps } from '../../../types/board';

interface AgentIdentityData {
  name: string;
  avatar?: string;
  description: string;
  role?: string;
}

export const AgentIdentityFrame: React.FC<FrameProps> = ({
  instance,
  engagementMode,
  onUpdate,
  onAction,
}) => {
  const [identity, setIdentity] = useState<AgentIdentityData>({
    name: '',
    description: '',
    role: 'Assistant',
    ...(instance.currentContent?.data as AgentIdentityData || {}),
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (instance.currentContent?.data) {
      setIdentity(prev => ({ ...prev, ...instance.currentContent.data }));
    }
  }, [instance.currentContent]);

  const handleUpdate = (field: keyof AgentIdentityData, value: string) => {
    const newIdentity = { ...identity, [field]: value };
    setIdentity(newIdentity);
    onUpdate?.(newIdentity);
  };

  const handleSave = () => {
    setIsEditing(false);
    onAction?.('save', identity);
  };

  const isPreviewMode = engagementMode === 'preview';

  if (isPreviewMode) {
    return (
      <div className="agent-identity-preview p-4 bg-card rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {identity.avatar ? (
              <img src={identity.avatar} alt={identity.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-primary font-medium text-lg">
                {identity.name ? identity.name.charAt(0).toUpperCase() : 'A'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate">
              {identity.name || 'Unnamed Agent'}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {identity.role || 'Assistant'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="agent-identity-frame bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-6">
        <div className="frame-header">
          <h2 className="text-lg font-semibold text-card-foreground">Agent Identity</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define your agent's personality and appearance
          </p>
        </div>

        <div className="identity-form space-y-4">
          {/* Avatar Section */}
          <div className="avatar-section">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Avatar
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                {identity.avatar ? (
                  <img 
                    src={identity.avatar} 
                    alt={identity.name} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <span className="text-muted-foreground font-medium text-xl">
                    {identity.name ? identity.name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="url"
                  placeholder="Avatar URL (optional)"
                  value={identity.avatar || ''}
                  onChange={(e) => handleUpdate('avatar', e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:ring-1 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div className="name-field">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Agent Name *
            </label>
            <input
              type="text"
              placeholder="Enter agent name..."
              value={identity.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
              required
            />
          </div>

          {/* Role Field */}
          <div className="role-field">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Role
            </label>
            <select
              value={identity.role || 'Assistant'}
              onChange={(e) => handleUpdate('role', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
            >
              <option value="Assistant">Assistant</option>
              <option value="Advisor">Advisor</option>
              <option value="Specialist">Specialist</option>
              <option value="Coach">Coach</option>
              <option value="Companion">Companion</option>
              <option value="Guide">Guide</option>
            </select>
          </div>

          {/* Description Field */}
          <div className="description-field">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Description
            </label>
            <textarea
              placeholder="Describe your agent's purpose and personality..."
              value={identity.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="frame-actions flex justify-between items-center pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Changes are saved automatically
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onAction?.('preview', identity)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={!identity.name.trim()}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Identity
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};