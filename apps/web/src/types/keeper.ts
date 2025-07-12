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

export interface KeeperListResponse extends KeeperApiResponse<Keeper[]> {}
export interface KeeperResponse extends KeeperApiResponse<Keeper> {}
export interface KeeperTypeListResponse extends KeeperApiResponse<KeeperType[]> {}
export interface EngagementTemplateListResponse extends KeeperApiResponse<EngagementTemplate[]> {}

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

export interface SoleReflectionResponse extends KeeperApiResponse<SoleReflection> {}
export interface SoleReflectionListResponse extends KeeperApiResponse<SoleReflection[]> {}

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

export interface SoleMemoryCardResponse extends KeeperApiResponse<SoleMemoryCard> {}
export interface SoleMemoryCardListResponse extends KeeperApiResponse<SoleMemoryCard[]> {}
export interface SoleMemoryCardsByTopicResponse extends KeeperApiResponse<Record<string, SoleMemoryCard[]>> {}

// Embedding Status Types
export interface EmbeddingStatus {
  total: number;
  embedded: number;
  pending: number;
}

export interface EmbeddingStatusResponse extends KeeperApiResponse<EmbeddingStatus> {}

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

export interface SoleVoiceEntryResponse extends KeeperApiResponse<SoleVoiceEntry> {}
export interface SoleVoiceEntryListResponse extends KeeperApiResponse<SoleVoiceEntry[]> {}

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

export interface SoleEchoResponse extends KeeperApiResponse<SoleEcho> {}
export interface SoleEchoListResponse extends KeeperApiResponse<SoleEcho[]> {}

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

export interface SoleLogbookEntryResponse extends KeeperApiResponse<SoleLogbookEntry> {}
export interface SoleLogbookEntryListResponse extends KeeperApiResponse<SoleLogbookEntry[]> {}
export interface CategoryListResponse extends KeeperApiResponse<string[]> {}
export interface TagListResponse extends KeeperApiResponse<string[]> {} 