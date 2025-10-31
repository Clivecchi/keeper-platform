/**
 * Design Board Template System Types
 * 
 * These types support the resolution and rendering of Design Board templates
 * for different Keeper Types and records.
 */

/**
 * Board with template capability
 */
export interface DesignBoard {
  id: string;
  keeperId: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  theme: Record<string, any>;
  behavior: Record<string, any>;
  data: Record<string, any>;
  access: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  frames?: DesignFrameInstance[];
}

/**
 * Frame instance with layout and props
 */
export interface DesignFrameInstance {
  id: string;
  boardId: string;
  entityType: string;
  entityId: string;
  configId: string;
  currentContentId?: string | null;
  role?: string | null;
  name: string;
  pattern: string;
  frameType: string;
  orderIndex: number;
  layoutKind: string;
  layoutData: Record<string, any>;
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * KeeperType with default board template
 */
export interface KeeperTypeWithTemplate {
  id: string;
  name: string;
  createdAt: Date;
  memoryPattern?: string | null;
  system: boolean;
  defaultBoardTemplateId?: string | null;
  defaultBoardTemplate?: DesignBoard | null;
}

/**
 * Generic KeeperRecord with custom board
 */
export interface KeeperRecord {
  id: string;
  typeId: string;
  type: KeeperTypeWithTemplate;
  customBoardId?: string | null;
  customBoard?: DesignBoard | null;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Board resolution result
 */
export interface BoardResolutionResult {
  board: DesignBoard;
  source: 'customBoardId' | 'defaultBoardTemplateId' | 'none';
  record: any;
}

/**
 * Prop type definitions for data binding
 */
export type PropType =
  | 'HeroImageProp'
  | 'TitleProp'
  | 'StatusTagProp'
  | 'FieldGridProp'
  | 'RecordListProp'
  | 'TaskListProp'
  | 'AIAssistantProp'
  | 'TagListProp'
  | 'AlertFeedProp'
  | 'MilestoneListProp'
  | 'MediaGalleryProp'
  | 'TaskSingleProp'
  | 'ReflectionProp'
  | 'StaticTextProp'
  | 'SignatureBlockProp'
  | 'RichTextProp';

/**
 * Prop definition with data binding
 */
export interface PropDefinition {
  type: PropType;
  dataSource?: string | string[];
  value?: any;
  config?: Record<string, any>;
}

/**
 * Frame layout specification
 */
export interface FrameLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Design Board template specification (for seeding)
 */
export interface DesignBoardTemplate {
  name: string;
  slug: string;
  description: string;
  keeperTypeName: string;
  frames: Array<{
    name: string;
    layout: FrameLayout;
    props: PropDefinition | PropDefinition[];
  }>;
}

