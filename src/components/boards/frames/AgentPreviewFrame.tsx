/**
 * AgentPreviewFrame Component
 * 
 * Frame for previewing the configured agent with its identity and tone settings.
 * Used in Agent Board to show how the agent will appear and behave.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { FrameProps } from '../../../types/board';

export const AgentPreviewFrame: React.FC<FrameProps> = ({
  instance,
  engagementMode,
  onUpdate,
  onAction,
}) => {
  const agentData = instance.currentContent?.data || {};
  const isPreviewMode = engagementMode === 'preview';

  if (isPreviewMode) {
    return (
      <div className="agent-preview-frame-preview p-4 bg-card rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary text-sm">👤</span>
          </div>
          <div>
            <h3 className="font-medium text-card-foreground">Agent Preview</h3>
            <p className="text-sm text-muted-foreground">Live agent demonstration</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="agent-preview-frame bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-6">
        <div className="frame-header">
          <h2 className="text-lg font-semibold text-card-foreground">Agent Preview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            See how your agent will appear and interact
          </p>
        </div>

        <div className="agent-preview-content bg-muted/50 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              {agentData.avatar ? (
                <img src={agentData.avatar} alt={agentData.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-primary font-medium">
                  {agentData.name ? agentData.name.charAt(0).toUpperCase() : 'A'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="bg-background border border-border rounded-lg p-3 mb-3">
                <p className="text-sm text-foreground">
                  Hello! I'm {agentData.name || 'your agent'}, your {agentData.role || 'assistant'}. 
                  {agentData.description && ` ${agentData.description}`}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{agentData.name || 'Agent'}</span>
                {agentData.tone && (
                  <span> • {agentData.tone.formality} tone • {agentData.tone.enthusiasm} energy</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="preview-controls">
          <button
            onClick={() => onAction?.('test', agentData)}
            className="w-full py-2 px-4 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Test Conversation
          </button>
        </div>

        <div className="frame-actions flex justify-between items-center pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Preview updates automatically
          </div>
          <button
            onClick={() => onAction?.('export', agentData)}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Export Config
          </button>
        </div>
      </div>
    </motion.div>
  );
};