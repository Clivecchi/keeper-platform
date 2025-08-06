/**
 * FrameRenderer Component
 * 
 * Dispatches frame rendering to specific frame components based on frame type.
 * Handles theme application and common frame functionality.
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { FrameProps, FrameType } from '../../types/board';

// Frame Components
import {
  MediaCardFrame,
  PreviewFrame,
  DialogFrame,
  ConfigPanelFrame,
  ProcessFrame,
  AgentPreviewFrame,
  AgentIdentityFrame,
  ToneSelectorFrame,
  DomainCardFrame,
  SetupStepsFrame,
  MemberListFrame,
  CustomDomainPanelFrame,
} from './frames';

const frameComponentMap: Record<FrameType, React.ComponentType<FrameProps>> = {
  media_card: MediaCardFrame,
  preview: PreviewFrame,
  dialog: DialogFrame,
  config_panel: ConfigPanelFrame,
  process_frame: ProcessFrame,
  agent_preview: AgentPreviewFrame,
  agent_identity: AgentIdentityFrame,
  tone_selector: ToneSelectorFrame,
  domain_card: DomainCardFrame,
  setup_steps: SetupStepsFrame,
  member_list: MemberListFrame,
  custom_domain_panel: CustomDomainPanelFrame,
};

export const FrameRenderer: React.FC<FrameProps> = ({
  instance,
  engagementMode,
  onUpdate,
  onAction,
}) => {
  const FrameComponent = frameComponentMap[instance.config.type as FrameType];

  if (!FrameComponent) {
    return (
      <div className="frame-error p-4 border border-destructive rounded-lg">
        <p className="text-destructive text-sm">
          Unknown frame type: {instance.config.type}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Frame ID: {instance.id}
        </p>
      </div>
    );
  }

  const frameTheme = instance.config.theme || {};
  const isPreviewMode = engagementMode === 'preview';

  return (
    <motion.div
      className={`frame-renderer frame-type-${instance.config.type} ${
        isPreviewMode ? 'frame-preview-mode' : ''
      }`}
      style={{
        // Apply frame-specific theme overrides
        ...frameTheme,
      }}
      layout={!isPreviewMode}
      layoutId={instance.id}
    >
      <div className="frame-wrapper">
        {instance.config.description && !isPreviewMode && (
          <div className="frame-description mb-2">
            <p className="text-xs text-muted-foreground">
              {instance.config.description}
            </p>
          </div>
        )}
        
        <div className="frame-content">
          <FrameComponent
            instance={instance}
            engagementMode={engagementMode}
            onUpdate={onUpdate}
            onAction={onAction}
          />
        </div>

        {!isPreviewMode && (
          <div className="frame-meta mt-2 text-xs text-muted-foreground">
            <span>{instance.config.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};