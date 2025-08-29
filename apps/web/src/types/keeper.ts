export interface KeeperType {
  id: string;
  name: string;
  memoryPattern?: string;
  system?: boolean;
  createdAt?: string;
  _count?: {
    Keeper: number;
  };
}

export interface Theme {
  id: string;
  label: string;
  slug: string;
  palette: Record<string, unknown>;
  style?: Record<string, unknown>;
  source_image?: string;
  inspired_by?: string;
  default_mode: string;
  tags?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EngagementTemplate {
  id: string;
  label: string;
  slug: string;
  type: string;
  targetType: string;
  icon?: string;
  style?: Record<string, unknown>;
  config?: Record<string, unknown>;
  system?: boolean;
  createdAt: string;
  updatedAt: string;
  keeperId?: string;
  engagement_fields?: EngagementField[];
  engagement_styles?: EngagementStyle[];
  Keeper?: {
    id: string;
    title: string;
  };
}

export interface EngagementField {
  id: string;
  name?: string;
  type?: string;
  config?: Record<string, unknown>;
}

export interface EngagementStyle {
  id: string;
  name?: string;
  style?: Record<string, unknown>;
}

export interface Journey {
  id: string;
  name: string;
  forward: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  keeperId: string;
  theme_id?: string;
  Path?: Path[];
  Moment?: Moment;
}

export interface Path {
  id: string;
  name: string;
  prelude: string;
  ownerId: string;
  journeyId: string;
  keeperId: string;
  theme_id?: string;
  Moment?: Moment;
}

export interface Moment {
  id: string;
  title: string;
  narrative: string;
  pathId?: string;
  journeyId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  theme_id?: string;
}

export interface Keeper {
  id: string;
  title: string;
  purpose: string;
  keeperTypeId?: string;
  keeperType?: string;
  memoryPattern?: string;
  sole?: Record<string, unknown>; // Approved agent-authored memory architecture
  soleDraft?: Record<string, unknown>; // Proposed draft structure by agent
  soleSubmittedAt?: string; // Timestamp when soleDraft was submitted
  ownerId: string;
  theme_id?: string;
  createdAt: string;
  updatedAt: string;
  KeeperType?: KeeperType;
  themes?: Theme;
  engagement_templates?: EngagementTemplate[];
  Journey?: Journey[];
  Path?: Path[];
  _count?: {
    Journey: number;
    Path: number;
  };
}

export interface CreateKeeperRequest {
  title: string;
  purpose: string;
  keeperTypeId?: string;
  keeperType?: string;
  memoryPattern?: string;
  theme_id?: string;
  ownerId: string;
}

export interface UpdateKeeperRequest {
  title?: string;
  purpose?: string;
  keeperTypeId?: string;
  keeperType?: string;
  memoryPattern?: string;
  theme_id?: string;
}

export interface KeeperApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string | unknown[];
}

export type KeeperListResponse = KeeperApiResponse<Keeper[]>;
export type KeeperResponse = KeeperApiResponse<Keeper>;
export type KeeperTypeListResponse = KeeperApiResponse<KeeperType[]>;
export type EngagementTemplateListResponse = KeeperApiResponse<EngagementTemplate[]>;

// SOLE Reflection Types
export interface SoleReflection {
  id: string;
  keeperId: string;
  agentId: string;
  content: string;
  topic?: string;
  createdAt: string;
  promotedToMemoryCard: boolean;
  promotedAt?: string;
  memoryCards?: SoleMemoryCard[];
}

export interface CreateReflectionRequest {
  keeperId: string;
  agentId: string;
  content: string;
  topic?: string;
}

export interface UpdateReflectionRequest {
  content?: string;
  topic?: string;
}

export type SoleReflectionResponse = KeeperApiResponse<SoleReflection>;
export type SoleReflectionListResponse = KeeperApiResponse<SoleReflection[]>;

// SOLE Memory Card Types
export interface SoleMemoryCard {
  id: string;
  keeperId: string;
  reflectionId: string; // Required to match Prisma schema
  content: string;
  topic?: string;
  embedding?: string; // JSON string for embedding vector
  embedded: boolean;
  createdAt: string;
  reflection?: {
    id: string;
    agentId: string;
    createdAt: string;
  };
}

export interface UpdateMemoryCardRequest {
  content?: string;
  topic?: string;
}

export type SoleMemoryCardResponse = KeeperApiResponse<SoleMemoryCard>;
export type SoleMemoryCardListResponse = KeeperApiResponse<SoleMemoryCard[]>;
export type SoleMemoryCardsByTopicResponse = KeeperApiResponse<Record<string, SoleMemoryCard[]>>;

// Embedding Status Types
export interface EmbeddingStatus {
  total: number;
  embedded: number;
  pending: number;
}

export type EmbeddingStatusResponse = KeeperApiResponse<EmbeddingStatus>;

// Base Response Type
export interface BaseResponse {
  success: boolean;
  error?: string;
  details?: string | unknown[];
}

// SOLE Voice Entry Types
export interface SoleVoiceEntry {
  id: string;
  keeperId: string;
  agentId: string;
  label: string;
  belief: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoiceEntryRequest {
  keeperId: string;
  agentId: string;
  label: string;
  belief: string;
}

export interface UpdateVoiceEntryRequest {
  label?: string;
  belief?: string;
}

export type SoleVoiceEntryResponse = KeeperApiResponse<SoleVoiceEntry>;
export type SoleVoiceEntryListResponse = KeeperApiResponse<SoleVoiceEntry[]>;

// SOLE Echo Types
export interface SoleEcho {
  id: string;
  keeperId: string;
  agentId: string;
  message: string;
  triggerDate?: string;
  triggerConditions?: Record<string, unknown>;
  createdAt: string;
  delivered: boolean;
}

export interface CreateEchoRequest {
  keeperId: string;
  agentId: string;
  message: string;
  triggerDate?: string;
  triggerConditions?: Record<string, unknown>;
}

export interface UpdateEchoRequest {
  message?: string;
  triggerDate?: string;
  triggerConditions?: Record<string, unknown>;
  delivered?: boolean;
}

export type SoleEchoResponse = KeeperApiResponse<SoleEcho>;
export type SoleEchoListResponse = KeeperApiResponse<SoleEcho[]>;

// SOLE Logbook Entry Types
export interface SoleLogbookEntry {
  id: string;
  keeperId: string;
  agentId: string;
  entry: string;
  label: string;
  category: string;
  createdAt: string;
  tags: string[];
}

export interface CreateLogbookEntryRequest {
  keeperId: string;
  agentId: string;
  entry: string;
  label: string;
  category: string;
  tags?: string[];
}

export interface UpdateLogbookEntryRequest {
  entry?: string;
  label?: string;
  category?: string;
  tags?: string[];
}

export type SoleLogbookEntryResponse = KeeperApiResponse<SoleLogbookEntry>;
export type SoleLogbookEntryListResponse = KeeperApiResponse<SoleLogbookEntry[]>;
export type CategoryListResponse = KeeperApiResponse<string[]>;
export type TagListResponse = KeeperApiResponse<string[]>;

// =============================================================================
// AGENT HOME BOARD TYPES
// =============================================================================

/**
 * Agent Board Configuration
 * Extends the existing Board system with Agent-specific functionality
 */
export interface AgentBoardConfig {
  agentId: string;
  boardId: string;
  layout: 'column' | 'grid' | 'canvas' | 'focus';
  pattern: 'dialogic' | 'wizard' | 'focus' | 'canvas' | 'gallery' | 'form';
  theme?: {
    primary?: string;
    background?: string;
    accent?: string;
  };
  behavior?: {
    showGrid?: boolean;
    snapToGrid?: boolean;
    gridSize?: number;
    defaultPattern?: string;
    startFrameId?: string | null;
    draftMode?: boolean;
    autosave?: boolean;
    frameOrder?: string[];
  };
}

/**
 * Topic Management for Agent Home Boards
 */
export interface Topic {
  id: string;
  boardId: string;
  title: string;
  essence?: string;
  tags: string[];
  status: 'active' | 'archived';
  parentId?: string;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
  highlights?: TopicHighlight[];
  links?: TopicLink[];
}

export interface TopicHighlight {
  id: string;
  topicId: string;
  kind: 'fact' | 'decision' | 'task' | 'question' | 'risk';
  text: string;
  sources?: Record<string, unknown>;
  createdAt: string;
}

export interface TopicLink {
  id: string;
  topicId: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Draft Management for Agents
 */
export interface AgentDraft {
  status: 'editing' | 'proposed' | 'committed' | 'rejected';
  title?: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentDraftHistory {
  id: string;
  agentId: string;
  snapshot: Record<string, unknown>;
  status: 'committed' | 'rejected';
  committedAt: string;
  reason?: string;
}

/**
 * Props System for Dynamic Frame Content
 */
export interface PropSchema {
  type: string;
  properties: Record<string, unknown>;
  required?: string[];
}

export interface PropBlock {
  id: string;
  type: string;
  data: Record<string, unknown>;
  schema: PropSchema;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

/**
 * Frame Props Registry
 */
export type FramePropsRegistry = {
  topic_chip: {
    title: string;
    status: 'active' | 'archived';
    tags?: string[];
    lastActiveAt?: string;
  };
  draft_summary: {
    title: string;
    status: 'editing' | 'proposed' | 'committed' | 'rejected';
    updatedAt: string;
    hasChanges?: boolean;
  };
  agent_status: {
    name: string;
    status: 'ready' | 'busy' | 'offline' | 'error';
    model?: string;
    provider?: string;
    lastActive?: string;
  };
  dialog_state: {
    messages: Array<{
      role: 'user' | 'agent';
      content: string;
      timestamp: string;
    }>;
    isActive: boolean;
    agentName?: string;
  };
};

/**
 * API Request/Response Types for Agent Home Board
 */
export interface CreateTopicRequest {
  title: string;
  parentId?: string;
  tags?: string[];
  essence?: string;
}

export interface UpdateTopicRequest {
  title?: string;
  essence?: string;
  status?: 'active' | 'archived';
  tags?: string[];
}

export interface CreateTopicHighlightRequest {
  kind: 'fact' | 'decision' | 'task' | 'question' | 'risk';
  text: string;
  sources?: Record<string, unknown>;
}

export interface UpdateAgentDraftRequest {
  status?: 'editing' | 'proposed' | 'committed' | 'rejected';
  title?: string;
  payload?: Record<string, unknown>;
}

/**
 * API Response Types
 */
export interface TopicResponse extends KeeperApiResponse<Topic> {}
export interface TopicListResponse extends KeeperApiResponse<Topic[]> {}
export interface TopicHighlightResponse extends KeeperApiResponse<TopicHighlight> {}
export interface TopicHighlightListResponse extends KeeperApiResponse<TopicHighlight[]> {}
export interface AgentDraftResponse extends KeeperApiResponse<AgentDraft> {}
export interface AgentDraftHistoryResponse extends KeeperApiResponse<AgentDraftHistory[]> {}

/**
 * Agent Home Board Bootstrap Response
 */
export interface AgentHomeBoardResponse extends KeeperApiResponse<{
  board: {
    id: string;
    name: string;
    data: {
      agentId: string;
      scope: string;
      entityId?: string;
    };
    frames: Array<{
      id: string;
      name: string;
      pattern: string;
      frameType: string;
      orderIndex: number;
      props: Record<string, unknown>;
    }>;
  };
  topics: Topic[];
  draft: AgentDraft | null;
}> {}