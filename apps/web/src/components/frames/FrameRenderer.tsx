/**
 * Frame Renderer
 * ==============
 * 
 * Main component for rendering different frame types dynamically.
 * This component dispatches to specific frame components based on the frame type.
 */

import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { 
  BaseFrameProps, 
  FrameType,
  FrameTypeRegistry 
} from '../../types/frame';
import { getFrameDef, registerFrameType as registerFrameTypeFromRegistry, parseFrameProps } from './registry';
import { registerAllExistingFrames } from './registerFrames';
import ActionPropRenderer from '../props/ActionPropRenderer';

// =============================================================================
// LAZY LOADED FRAME COMPONENTS
// =============================================================================

const MediaCardFrame = lazy(() => import('./MediaCardFrame'));
const PreviewFrame = lazy(() => import('./PreviewFrame'));
const DialogFrame = lazy(() => import('./DialogFrame'));
const ConfigPanelFrame = lazy(() => import('./ConfigPanelFrame'));
const ProcessFrame = lazy(() => import('./ProcessFrame'));
const AgentPreviewFrame = lazy(() => import('./AgentPreviewFrame'));
const CodeSnippetFrame = lazy(() => import('./CodeSnippetFrame'));

// Domain-specific frames
const DomainCardFrame = lazy(() => import('./DomainCardFrame'));
const SetupStepsFrame = lazy(() => import('./SetupStepsFrame'));
const MemberListFrame = lazy(() => import('./MemberListFrame'));
const CustomDomainFrame = lazy(() => import('./CustomDomainFrame'));

// Journey-specific frames
const JourneyOverviewFrame = lazy(() => import('./journey-overview-frame'));
const PathListFrame = lazy(() => import('./path-list-frame'));
const MomentGridFrame = lazy(() => import('./moment-grid-frame'));
const JourneyConfigFrame = lazy(() => import('./journey-config-frame'));

// Keeper Type-specific frames
const KeeperTypeOverviewFrame = lazy(() => import('./keeper-type-overview-frame'));
const KeeperTypeConfigFrame = lazy(() => import('./keeper-type-config-frame'));
const LinkedJourneysFrame = lazy(() => import('./linked-journeys-frame'));
const LinkedAgentsFrame = lazy(() => import('./linked-agents-frame'));
const KeeperTypeProcessFrame = lazy(() => import('./keeper-type-process-frame'));

// People-specific frames
const PeopleOverviewFrame = lazy(() => import('./people-overview-frame'));
const RoleManagerFrame = lazy(() => import('./role-manager-frame'));
const CollaborationNetworkFrame = lazy(() => import('./collaboration-network-frame'));
const ActivityFeedFrame = lazy(() => import('./activity-feed-frame'));
const PeopleProcessFrame = lazy(() => import('./people-process-frame'));

// Agent Home Board frames
const TopicsFrame = lazy(() => import('./TopicsFrame'));
const DraftFrame = lazy(() => import('./DraftFrame'));

// =============================================================================
// FRAME TYPE REGISTRY (Externalized)
// =============================================================================

// Populate the external registry with existing frames.
registerAllExistingFrames();

// =============================================================================
// FRAME RENDERER PROPS
// =============================================================================

interface FrameRendererProps extends BaseFrameProps {
  fallbackComponent?: React.ComponentType<BaseFrameProps>;
  showLoadingSpinner?: boolean;
  animationPreset?: 'fade' | 'slide' | 'scale' | 'none';
}

// =============================================================================
// FALLBACK COMPONENT
// =============================================================================

const DefaultFallbackFrame: React.FC<BaseFrameProps> = ({ frameInstance, className = '' }) => (
  <div className={`p-6 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
    <div className="flex items-center justify-center text-gray-500">
      <ExclamationTriangleIcon className="w-8 h-8 mr-3" />
      <div>
        <h3 className="text-lg font-medium">Unknown Frame Type</h3>
        <p className="text-sm">
          Frame type "{frameInstance.FrameConfig?.frameType || 'unknown'}" is not supported.
        </p>
      </div>
    </div>
  </div>
);

// =============================================================================
// LOADING COMPONENT
// =============================================================================

const FrameLoadingSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// =============================================================================
// ANIMATION PRESETS
// =============================================================================

const animationPresets = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  slide: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4 }
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.3 }
  },
  none: {}
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const FrameRenderer: React.FC<FrameRendererProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  fallbackComponent: FallbackComponent = DefaultFallbackFrame,
  showLoadingSpinner = true,
  animationPreset = 'fade',
}) => {
  // Determine frame type from config or default to 'preview'
  const frameType: FrameType = frameInstance.FrameConfig?.frameType || 'preview';
  
  // Check for domain-specific frames first
  let FrameComponent: any = null;

  // Try registry first when the frame type matches Phase 1 types
  const registryDef = getFrameDef(frameType as any);
  if (registryDef) {
    FrameComponent = registryDef.Component;
  }
  
  // Handle domain-specific frame overrides
  if (frameInstance.entityType === 'domain') {
    if (frameInstance.id.includes('domain-card')) {
      FrameComponent = DomainCardFrame;
    } else if (frameInstance.id.includes('setup-steps')) {
      FrameComponent = SetupStepsFrame;
    } else if (frameInstance.id.includes('member-list')) {
      FrameComponent = MemberListFrame;
    } else if (frameInstance.id.includes('custom-domain')) {
      FrameComponent = CustomDomainFrame;
    }
  }
  
  // Handle journey-specific frame overrides
  if (frameInstance.entityType === 'journey') {
    if (frameInstance.id.includes('journey-overview')) {
      FrameComponent = JourneyOverviewFrame;
    } else if (frameInstance.id.includes('path-list')) {
      FrameComponent = PathListFrame;
    } else if (frameInstance.id.includes('moment-grid')) {
      FrameComponent = MomentGridFrame;
    } else if (frameInstance.id.includes('journey-config')) {
      FrameComponent = JourneyConfigFrame;
    }
  }
  
  // Handle keeper type-specific frame overrides
  if (frameInstance.entityType === 'keeper_type') {
    if (frameInstance.id.includes('keeper-type-overview')) {
      FrameComponent = KeeperTypeOverviewFrame;
    } else if (frameInstance.id.includes('keeper-type-config')) {
      FrameComponent = KeeperTypeConfigFrame;
    } else if (frameInstance.id.includes('linked-journeys')) {
      FrameComponent = LinkedJourneysFrame;
    } else if (frameInstance.id.includes('linked-agents')) {
      FrameComponent = LinkedAgentsFrame;
    } else if (frameInstance.id.includes('keeper-type-process')) {
      FrameComponent = KeeperTypeProcessFrame;
    }
  }
  
  // Handle people-specific frame overrides
  if (frameInstance.entityType === 'people') {
    if (frameInstance.id.includes('people-overview')) {
      FrameComponent = PeopleOverviewFrame;
    } else if (frameInstance.id.includes('role-manager')) {
      FrameComponent = RoleManagerFrame;
    } else if (frameInstance.id.includes('collaboration-network')) {
      FrameComponent = CollaborationNetworkFrame;
    } else if (frameInstance.id.includes('activity-feed')) {
      FrameComponent = ActivityFeedFrame;
    } else if (frameInstance.id.includes('people-process')) {
      FrameComponent = PeopleProcessFrame;
    }
  }
  
  // If still no component found from overrides and registry, fall back to legacy map for non-P1 types
  if (!FrameComponent) {
    const legacyMap: FrameTypeRegistry = {
      media_card: MediaCardFrame,
      preview: PreviewFrame,
      dialog: DialogFrame,
      config_panel: ConfigPanelFrame,
      process_frame: ProcessFrame,
      agent_preview: AgentPreviewFrame,
      code_snippet: CodeSnippetFrame,
      topics: TopicsFrame,
      draft: DraftFrame,
    } as any;
    FrameComponent = legacyMap[frameType];
  }

  // If no component found, use fallback
  if (!FrameComponent) {
    return (
      <FallbackComponent
        frameInstance={frameInstance}
        className={className}
        onInteraction={onInteraction}
        isPreview={isPreview}
      />
    );
  }

  // Get animation props
  const animationProps = animationPresets[animationPreset];

  // Render with animation wrapper
  // Parse props via registry schema if available
  let parsedProps: Record<string, unknown> | undefined;
  if (registryDef) {
    try {
      parsedProps = parseFrameProps(registryDef as any, {
        agentId: (frameInstance as any)?.entityId,
        topicId: (frameInstance as any)?.props?.topicId,
      });
    } catch (e) {
      // Surface minimal error UI and continue rendering without extra props
      console.error('Frame prop validation failed:', e);
    }
  }

  // Extract action props from frameInstance
  const frameProps = (frameInstance as any)?.props || [];
  const actionProps = Array.isArray(frameProps) 
    ? frameProps.filter((p: any) => p?.type?.startsWith('action.'))
    : [];

  const content = (
    <div className="space-y-4">
      <Suspense 
        fallback={showLoadingSpinner ? <FrameLoadingSpinner className={className} /> : null}
      >
        <FrameComponent
          frameInstance={frameInstance}
          className={className}
          onInteraction={onInteraction}
          isPreview={isPreview}
          {...(parsedProps || {})}
        />
      </Suspense>
      
      {/* Render action props if any exist */}
      {actionProps.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {actionProps.map((prop: any) => (
            <ActionPropRenderer
              key={prop.id}
              prop={prop}
              boardId={(frameInstance as any)?.boardId}
              frameId={frameInstance.id}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Apply animation if specified
  if (animationPreset === 'none') {
    return content;
  }

  return (
    <motion.div {...animationProps}>
      {content}
    </motion.div>
  );
};

// =============================================================================
// FRAME TYPE UTILITIES
// =============================================================================

/**
 * Get all supported frame types
 */
export const getSupportedFrameTypes = (): FrameType[] => {
  // This reflects only legacy map types; Phase 1 types are in the external registry
  return ['media_card','preview','dialog','config_panel','process_frame','agent_preview','code_snippet','topics','draft'] as FrameType[];
};

/**
 * Check if a frame type is supported
 */
export const isFrameTypeSupported = (frameType: string): frameType is FrameType => {
  return getFrameDef(frameType as any) != null || ['media_card','preview','dialog','config_panel','process_frame','agent_preview','code_snippet','topics','draft'].includes(frameType);
};

/**
 * Register a new frame type component
 */
export const registerFrameType = registerFrameTypeFromRegistry as unknown as (frameType: FrameType, component: React.ComponentType<BaseFrameProps>) => void;

// =============================================================================
// EXPORTS
// =============================================================================

export default FrameRenderer;
