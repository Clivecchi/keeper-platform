/**
 * Frame System Types
 * ==================
 * 
 * TypeScript interfaces for the new Frame system that replaces MediaFrame.
 * These types align with the backend Prisma models: FrameConfig, FrameContent, FrameInstance
 */

// Import database types (own the web-side content shape locally)
import type { FrameConfig, FrameInstance } from '@keeper/database';

// =============================================================================
// FRAME TYPE DEFINITIONS
// =============================================================================

/**
 * Supported frame types for rendering different UI patterns
 */
export type FrameType = 
  | 'media_card'      // Rich media presentation
  | 'preview'         // Compact content summary  
  | 'dialog'          // Guided agent interaction
  | 'config_panel'    // Form-based or tabbed settings
  | 'process_frame'   // Step-based UI flows
  | 'agent_preview'   // Agent identity/config visualization
  | 'code_snippet'    // Code viewer/editor (reserved for CodeBoard)
  | 'topics'          // Topic management for Agent Home Boards
  | 'draft';          // Draft management for agents

/**
 * Frame engagement modes that control interaction style
 */
export type EngagementMode = 
  | 'dialogic'  // Default - interaction guided by agent prompts
  | 'wizard'    // Multi-step sequential flow
  | 'focus'     // Single-frame deep interaction  
  | 'canvas';   // Freeform layout for composing frames

// =============================================================================
// EXTENDED FRAME INTERFACES
// =============================================================================

/**
 * Extended FrameConfig with frontend-specific properties
 */
export interface ExtendedFrameConfig extends FrameConfig {
  frameType?: FrameType;
  engagementMode?: EngagementMode;
  layout?: {
    width?: number;
    height?: number;
    position?: { x: number; y: number };
  };
}

/**
 * Extended FrameContent with rendering metadata
 */
// Web-owned content shape used by renderers and previews
export type ExtendedFrameContent = {
  id?: string;
  type?: string;
  url?: string;
  alt?: string;
  // Keep open for renderer-specific fields
  [key: string]: unknown;
};

/**
 * Extended FrameInstance with populated relations
 */
export type ExtendedFrameInstance = FrameInstance & {
  FrameConfig?: ExtendedFrameConfig;
  FrameContent_FrameInstance_currentContentIdToFrameContent?: ExtendedFrameContent;
  FrameContent_FrameContent_playlistOwnerIdToFrameInstance?: ExtendedFrameContent[];
};

// =============================================================================
// FRAME RENDERING PROPS
// =============================================================================

/**
 * Base props for all frame components
 */
export interface BaseFrameProps {
  frameInstance: ExtendedFrameInstance;
  className?: string;
  onInteraction?: (interaction: FrameInteraction) => void;
  isPreview?: boolean;
}

/**
 * Props for media card frames
 */
export interface MediaCardFrameProps extends BaseFrameProps {
  autoPlay?: boolean;
  showControls?: boolean;
}

/**
 * Props for dialog frames
 */
export interface DialogFrameProps extends BaseFrameProps {
  agentId?: string;
  conversationHistory?: FrameMessage[];
  onSendMessage?: (message: string) => void;
}

/**
 * Props for config panel frames
 */
export interface ConfigPanelFrameProps extends BaseFrameProps {
  tabs?: FrameTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

// =============================================================================
// FRAME INTERACTION TYPES
// =============================================================================

/**
 * Frame interaction events
 */
export interface FrameInteraction {
  type: 'click' | 'hover' | 'focus' | 'submit' | 'navigate';
  frameId: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Frame message for dialog interactions
 */
export interface FrameMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Frame tab for config panels
 */
export interface FrameTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  disabled?: boolean;
}

// =============================================================================
// FRAME CONTEXT TYPES
// =============================================================================

/**
 * Frame context state
 */
export interface FrameContextState {
  activeFrames: ExtendedFrameInstance[];
  currentEngagementMode: EngagementMode;
  isLoading: boolean;
  error: string | null;
}

/**
 * Frame context actions
 */
export interface FrameContextActions {
  loadFrame: (frameId: string) => Promise<void>;
  updateFrame: (frameId: string, updates: Partial<ExtendedFrameInstance>) => Promise<void>;
  removeFrame: (frameId: string) => void;
  setEngagementMode: (mode: EngagementMode) => void;
  handleFrameInteraction: (interaction: FrameInteraction) => void;
}

/**
 * Complete frame context type
 */
export interface FrameContextType extends FrameContextState, FrameContextActions {}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Frame API response wrapper
 */
export interface FrameApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string | unknown[];
}

/**
 * Specific frame API response types
 */
export type FrameConfigResponse = FrameApiResponse<ExtendedFrameConfig>;
export interface FrameContentResponse extends FrameApiResponse<ExtendedFrameContent> {}
export interface FrameInstanceResponse extends FrameApiResponse<ExtendedFrameInstance> {}
export interface FrameInstanceListResponse extends FrameApiResponse<ExtendedFrameInstance[]> {}

// =============================================================================
// FRAME CREATION TYPES
// =============================================================================

/**
 * Request to create a new frame config
 */
export interface CreateFrameConfigRequest {
  name: string;
  description?: string;
  theme?: Record<string, unknown>;
  frameType?: FrameType;
  engagementMode?: EngagementMode;
}

/**
 * Request to create frame content
 */
export interface CreateFrameContentRequest {
  type: string;
  url: string;
  alt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request to create frame instance
 */
export interface CreateFrameInstanceRequest {
  entityType: string;
  entityId: string;
  configId: string;
  currentContentId?: string;
}

// =============================================================================
// FRAME UTILITIES
// =============================================================================

/**
 * Frame renderer component type
 */
// Allow both function and class components
export type FrameRendererComponent = React.ComponentType<BaseFrameProps>;

/**
 * Frame type registry for dynamic rendering
 */
export type FrameTypeRegistry = Record<FrameType, FrameRendererComponent>;
