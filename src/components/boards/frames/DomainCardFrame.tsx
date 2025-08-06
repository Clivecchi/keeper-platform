/**
 * DomainCardFrame Component
 * 
 * Frame for displaying domain information and basic configuration.
 * Used in Domain Board for domain management.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FrameProps } from '../../../types/board';

interface DomainData {
  name: string;
  description?: string;
  memberCount: number;
  status: 'active' | 'setup' | 'suspended';
  customDomain?: string;
  createdAt: Date;
}

export const DomainCardFrame: React.FC<FrameProps> = ({
  instance,
  engagementMode,
  onUpdate,
  onAction,
}) => {
  const [domain, setDomain] = useState<DomainData>({
    name: 'My Domain',
    description: 'A personal space for organization and productivity.',
    memberCount: 1,
    status: 'active',
    createdAt: new Date(),
    ...(instance.currentContent?.data as DomainData || {}),
  });

  useEffect(() => {
    if (instance.currentContent?.data) {
      setDomain(prev => ({ ...prev, ...instance.currentContent.data }));
    }
  }, [instance.currentContent]);

  const isPreviewMode = engagementMode === 'preview';

  if (isPreviewMode) {
    return (
      <div className="domain-card-preview p-4 bg-card rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <span className="text-primary text-lg">🏠</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-card-foreground truncate">
              {domain.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {domain.memberCount} member{domain.memberCount !== 1 ? 's' : ''} • {domain.status}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    setup: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <motion.div
      className="domain-card-frame bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-6">
        <div className="frame-header">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-primary text-2xl">🏠</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-card-foreground">{domain.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {domain.description}
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[domain.status]}`}>
              {domain.status.charAt(0).toUpperCase() + domain.status.slice(1)}
            </div>
          </div>
        </div>

        <div className="domain-stats grid grid-cols-3 gap-4">
          <div className="stat-card bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-card-foreground">{domain.memberCount}</div>
            <div className="text-sm text-muted-foreground">Member{domain.memberCount !== 1 ? 's' : ''}</div>
          </div>
          <div className="stat-card bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-card-foreground">3</div>
            <div className="text-sm text-muted-foreground">Boards</div>
          </div>
          <div className="stat-card bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-card-foreground">12</div>
            <div className="text-sm text-muted-foreground">Frames</div>
          </div>
        </div>

        {domain.customDomain && (
          <div className="custom-domain bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-card-foreground">Custom Domain</h3>
                <p className="text-sm text-muted-foreground">{domain.customDomain}</p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        )}

        <div className="domain-info text-sm text-muted-foreground">
          <p>Created {domain.createdAt.toLocaleDateString()}</p>
        </div>

        <div className="frame-actions flex justify-between items-center pt-4 border-t border-border">
          <button
            onClick={() => onAction?.('settings', domain)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Domain Settings
          </button>
          <div className="flex space-x-2">
            <button
              onClick={() => onAction?.('invite', domain)}
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
            >
              Invite Members
            </button>
            <button
              onClick={() => onAction?.('manage', domain)}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};