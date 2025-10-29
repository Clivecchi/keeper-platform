/**
 * Unified Frame Types
 * ===================
 * 
 * Single source of truth for Frame types across Board Studio.
 * These types unify the v0 StudioFrame, database FrameInstance, and PatternRenderer FrameData.
 * 
 * Design Principles:
 * - Props are ALWAYS arrays (never objects)
 * - Pattern drives rendering (not role)
 * - Composable props define capabilities
 * - No role-based special cases
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Frame role - defines the frame's purpose within a board
 */
export type FrameRole = 'cover' | 'settings' | 'custom';

/**
 * Engagement pattern - defines how users interact with the frame
 */
export type FramePattern = 
  | 'focus'     // Single-item deep dive (hero, cover, featured content)
  | 'canvas'    // Freeform composition with props
  | 'dialogic'  // Conversational interface
  | 'wizard'    // Step-by-step sequential flow
  | 'gallery'   // Grid or list of items
  | 'form';     // Input collection

/**
 * Frame type - defines the visual presentation style
 */
export type FrameType = 
  | 'media_card'    // Rich media with overlays
  | 'preview'       // Compact summary
  | 'dialog'        // Chat interface
  | 'config_panel'  // Settings UI
  | 'process_frame' // Multi-step process
  | 'agent_preview' // Agent identity card
  | 'code_snippet'  // Code display
  | 'topics'        // Topic management
  | 'draft';        // Draft management

/**
 * Editor mode - defines the editing context
 */
export type EditorMode = 
  | 'studio'  // Full editing with controls
  | 'preview' // Read-only final view
  | 'assist'; // AI-assisted editing

// =============================================================================
// PROP TYPES
// =============================================================================

/**
 * Prop configuration - specific to each prop type
 */
export type PropConfig = Record<string, unknown>;

/**
 * Base prop type - all props extend this
 */
export interface BaseProp {
  id: string;
  type: string;
  config: PropConfig;
  orderIndex?: number;
}

/**
 * Specific prop types
 */

export interface HeadingProp extends BaseProp {
  type: 'heading';
  config: {
    content: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface TextProp extends BaseProp {
  type: 'text';
  config: {
    content: string;
    fontSize?: 'small' | 'medium' | 'large';
    bold?: boolean;
    alignment?: 'left' | 'center' | 'right';
  };
}

export interface ImageProp extends BaseProp {
  type: 'image';
  config: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
}

export interface VideoProp extends BaseProp {
  type: 'video';
  config: {
    url: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    posterUrl?: string;
  };
}

export interface ButtonProp extends BaseProp {
  type: 'button';
  config: {
    label: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    action?: string;
    url?: string;
  };
}

export interface QuoteProp extends BaseProp {
  type: 'quote';
  config: {
    content: string;
    author?: string;
    style?: 'bordered' | 'background' | 'minimal';
  };
}

export interface FormProp extends BaseProp {
  type: 'form';
  config: {
    name: string;
    fields: FormField[];
    submitLabel?: string;
  };
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select fields
}

export interface GalleryProp extends BaseProp {
  type: 'gallery';
  config: {
    name: string;
    images: Array<{
      url: string;
      alt?: string;
      caption?: string;
    }>;
    layout?: 'grid' | 'masonry' | 'carousel';
    columns?: number;
  };
}

export interface AIAssistantProp extends BaseProp {
  type: 'ai-assistant';
  config: {
    greeting?: string;
    placeholder?: string;
    agentId?: string;
  };
}

/**
 * Union type of all prop types
 */
export type FrameProp = 
  | HeadingProp
  | TextProp
  | ImageProp
  | VideoProp
  | ButtonProp
  | QuoteProp
  | FormProp
  | GalleryProp
  | AIAssistantProp
  | BaseProp; // Fallback for unknown types

// =============================================================================
// UNIFIED FRAME TYPE
// =============================================================================

/**
 * UnifiedFrame - The canonical frame representation
 * 
 * This is the single source of truth for frames in Board Studio.
 * All other representations (StudioFrame, FrameInstance, FrameData) should
 * be converted to/from this type.
 */
export interface UnifiedFrame {
  // Identity
  id: string;
  name: string;
  
  // Classification
  role: FrameRole;
  pattern: FramePattern;
  frameType: FrameType;
  
  // Content
  props: FrameProp[];
  
  // Layout (optional - for canvas pattern)
  layoutKind?: 'standard' | 'grid' | 'flex' | 'canvas';
  layoutData?: {
    columns?: number;
    gap?: number;
    padding?: number;
    alignment?: 'start' | 'center' | 'end';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  };
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// =============================================================================
// BOARD TYPES
// =============================================================================

/**
 * Board theme configuration
 */
export interface BoardTheme {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  borderColor: string;
  fontFamily?: string;
}

/**
 * Board behavior configuration
 */
export interface BoardBehavior {
  showGrid?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  defaultPattern?: FramePattern;
  enableComments?: boolean;
  enableSharing?: boolean;
}

/**
 * Board access control
 */
export interface BoardAccess {
  visibility: 'public' | 'private' | 'unlisted';
  allowComments: boolean;
  shareLinkEnabled: boolean;
  password?: string;
}

/**
 * UnifiedBoard - The canonical board representation
 */
export interface UnifiedBoard {
  // Identity
  id: string;
  keeperId: string;
  name: string;
  slug: string;
  description?: string;
  
  // Configuration
  theme: BoardTheme;
  behavior: BoardBehavior;
  access: BoardAccess;
  
  // Content
  frames: UnifiedFrame[];
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if a prop is a specific type
 */
export function isPropType<T extends FrameProp>(
  prop: FrameProp,
  type: T['type']
): prop is T {
  return prop.type === type;
}

/**
 * Type guard to check if frame has a specific pattern
 */
export function hasPattern(
  frame: UnifiedFrame,
  pattern: FramePattern
): boolean {
  return frame.pattern === pattern;
}

/**
 * Type guard to check if frame has a specific role
 */
export function hasRole(
  frame: UnifiedFrame,
  role: FrameRole
): boolean {
  return frame.role === role;
}

/**
 * Check if frame has a prop of a specific type
 */
export function hasProp(
  frame: UnifiedFrame,
  propType: string
): boolean {
  return frame.props.some(prop => prop.type === propType);
}

/**
 * Get prop by type from frame
 */
export function getProp<T extends FrameProp>(
  frame: UnifiedFrame,
  propType: T['type']
): T | undefined {
  return frame.props.find(prop => prop.type === propType) as T | undefined;
}

/**
 * Get all props of a specific type
 */
export function getProps<T extends FrameProp>(
  frame: UnifiedFrame,
  propType: T['type']
): T[] {
  return frame.props.filter(prop => prop.type === propType) as T[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Partial frame update - for PATCH operations
 */
export type FrameUpdate = Partial<Omit<UnifiedFrame, 'id' | 'createdAt'>>;

/**
 * Frame creation data - for POST operations
 */
export type FrameCreate = Omit<UnifiedFrame, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Board update - for PATCH operations
 */
export type BoardUpdate = Partial<Omit<UnifiedBoard, 'id' | 'keeperId' | 'createdAt'>>;

/**
 * Board creation data - for POST operations
 */
export type BoardCreate = Omit<UnifiedBoard, 'id' | 'createdAt' | 'updatedAt'>;

