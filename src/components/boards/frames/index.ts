/**
 * Frame Components Index
 * 
 * Exports all frame components and provides placeholder implementations
 * for frame types that haven't been fully implemented yet.
 */

import React from 'react';
import type { FrameProps } from '../../../types/board';

// Implemented Agent Board Frames
export { AgentIdentityFrame } from './AgentIdentityFrame';
export { ToneSelectorFrame } from './ToneSelectorFrame';
export { AgentPreviewFrame } from './AgentPreviewFrame';

// Implemented Domain Board Frames
export { DomainCardFrame } from './DomainCardFrame';

// Placeholder Frame Component
const PlaceholderFrame: React.FC<FrameProps & { frameType: string }> = ({ 
  frameType, 
  instance, 
  engagementMode 
}) => {
  const isPreviewMode = engagementMode === 'preview';

  if (isPreviewMode) {
    return (
      <div className="placeholder-frame-preview p-4 bg-card rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">📋</span>
          </div>
          <div>
            <h3 className="font-medium text-card-foreground capitalize">
              {frameType.replace('_', ' ')}
            </h3>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="placeholder-frame bg-card border border-border rounded-lg p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <span className="text-muted-foreground text-2xl">📋</span>
        </div>
        <div>
          <h3 className="font-medium text-card-foreground capitalize mb-1">
            {frameType.replace('_', ' ')} Frame
          </h3>
          <p className="text-sm text-muted-foreground">
            This frame type is coming soon. The component structure is ready for implementation.
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">
          Frame ID: {instance.id}
        </div>
      </div>
    </div>
  );
};

// Placeholder implementations for frame types not yet implemented
export const MediaCardFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="media_card" />
);

export const PreviewFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="preview" />
);

export const DialogFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="dialog" />
);

export const ConfigPanelFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="config_panel" />
);

export const ProcessFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="process_frame" />
);

// Domain Board Frame placeholders (DomainCardFrame is implemented above)

export const SetupStepsFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="setup_steps" />
);

export const MemberListFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="member_list" />
);

export const CustomDomainPanelFrame: React.FC<FrameProps> = (props) => (
  <PlaceholderFrame {...props} frameType="custom_domain_panel" />
);