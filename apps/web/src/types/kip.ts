export type KipCommandIntent = {
  action: string;
  keeper_id: string;
  type: string;
  data: Record<string, unknown>;
};

export type AgentInfo = {
  id: string;
  name: string;
  purpose: string;
  status: 'ready' | 'in-progress' | 'error';
  model: string;
};

export type KipThought = {
  id: string;
  timestamp: Date;
  content: string;
  priority: 'low' | 'medium' | 'high';
};

// Agent visibility and permission types
export type AgentVisibility = 'private' | 'public' | 'shared';
export type AgentPermission = 'run' | 'edit' | 'delete' | 'share';
export type ModelProvider = 'openai' | 'anthropic' | 'together-ai' | 'elevenlabs';

// User API key management
export interface UserApiKey {
  provider: ModelProvider;
  maskedKey: string;
}

// Agent permission entry
export interface AgentPermissionEntry {
  user_id: string;
  permission: AgentPermission;
  user?: {
    name?: string;
    email?: string;
  };
}

// Model settings interface
export interface ModelSettings {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  retry?: {
    max_retries: number;
    retry_delay_ms: number;
  };
} 