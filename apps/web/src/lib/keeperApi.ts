import { 
  KeeperType, 
  CreateKeeperRequest, 
  UpdateKeeperRequest,
  KeeperListResponse,
  KeeperResponse,
  KeeperTypeListResponse,
  EngagementTemplateListResponse,
  SoleReflectionListResponse,
  CreateReflectionRequest,
  UpdateReflectionRequest,
  SoleReflectionResponse,
  BaseResponse,
  SoleMemoryCardListResponse,
  SoleMemoryCardsByTopicResponse,
  EmbeddingStatusResponse,
  UpdateMemoryCardRequest,
  SoleMemoryCardResponse
} from '../types/keeper';

// Env-driven absolute API origin for building links
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL || '';

class KeeperApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const base = API_BASE_URL && String(API_BASE_URL).startsWith('http') ? API_BASE_URL.replace(/\/+$/, '') : location.origin;
    const url = `${base}/api/keeper${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Keeper CRUD operations
  async getAllKeepers(userId: string): Promise<KeeperListResponse> {
    return this.request<KeeperListResponse>(`/keepers?userId=${userId}`);
  }

  async getKeeperById(id: string, userId: string): Promise<KeeperResponse> {
    return this.request<KeeperResponse>(`/keepers/${id}?userId=${userId}`);
  }

  async createKeeper(data: CreateKeeperRequest): Promise<KeeperResponse> {
    return this.request<KeeperResponse>('/keepers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKeeper(id: string, data: UpdateKeeperRequest, userId: string): Promise<KeeperResponse> {
    return this.request<KeeperResponse>(`/keepers/${id}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteKeeper(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/keepers/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
  }

  // Keeper types
  async getKeeperTypes(): Promise<KeeperTypeListResponse> {
    return this.request<KeeperTypeListResponse>('/keeper-types');
  }

  async createKeeperType(name: string): Promise<{ success: boolean; data: KeeperType }> {
    return this.request<{ success: boolean; data: KeeperType }>('/keeper-types', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Engagement templates
  async getEngagementTemplatesByType(keeperType: string): Promise<EngagementTemplateListResponse> {
    return this.request<EngagementTemplateListResponse>(`/engagement-templates/${keeperType}`);
  }

  async getEngagementTemplatesByKeeperType(keeperTypeId: string): Promise<EngagementTemplateListResponse> {
    return this.request<EngagementTemplateListResponse>(`/keeper-types/${keeperTypeId}/engagement-templates`);
  }

  // SOLE Reflections
  async getReflectionsByKeeper(keeperId: string, userId: string): Promise<SoleReflectionListResponse> {
    return this.request<SoleReflectionListResponse>(`/keepers/${keeperId}/reflections?userId=${userId}`);
  }

  async getSuggestedPromotions(keeperId: string, userId: string): Promise<SoleReflectionListResponse> {
    return this.request<SoleReflectionListResponse>(`/keepers/${keeperId}/reflections/suggestions?userId=${userId}`);
  }

  async createReflection(data: CreateReflectionRequest, userId: string): Promise<SoleReflectionResponse> {
    return this.request<SoleReflectionResponse>(`/keepers/${data.keeperId}/reflections?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateReflection(id: string, data: UpdateReflectionRequest, userId: string): Promise<SoleReflectionResponse> {
    return this.request<SoleReflectionResponse>(`/reflections/${id}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteReflection(id: string, userId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/reflections/${id}?userId=${userId}`, {
      method: 'DELETE'
    });
  }

  async promoteReflectionToMemoryCard(id: string, userId: string): Promise<SoleReflectionResponse> {
    return this.request<SoleReflectionResponse>(`/reflections/${id}/promote?userId=${userId}`, {
      method: 'POST'
    });
  }

  // SOLE Memory Cards
  async getMemoryCardsByKeeper(keeperId: string, userId: string, filters?: { topic?: string; embedded?: boolean }): Promise<SoleMemoryCardListResponse> {
    const params = new URLSearchParams({ userId });
    if (filters?.topic) params.append('topic', filters.topic);
    if (filters?.embedded !== undefined) params.append('embedded', filters.embedded.toString());
    
    return this.request<SoleMemoryCardListResponse>(`/keepers/${keeperId}/memory-cards?${params}`);
  }

  async getMemoryCardsByTopic(keeperId: string, userId: string): Promise<SoleMemoryCardsByTopicResponse> {
    return this.request<SoleMemoryCardsByTopicResponse>(`/keepers/${keeperId}/memory-cards/by-topic?userId=${userId}`);
  }

  async getEmbeddingStatus(keeperId: string, userId: string): Promise<EmbeddingStatusResponse> {
    return this.request<EmbeddingStatusResponse>(`/keepers/${keeperId}/memory-cards/embedding-status?userId=${userId}`);
  }

  async updateMemoryCard(id: string, data: UpdateMemoryCardRequest, userId: string): Promise<SoleMemoryCardResponse> {
    return this.request<SoleMemoryCardResponse>(`/memory-cards/${id}?userId=${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteMemoryCard(id: string, userId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/memory-cards/${id}?userId=${userId}`, {
      method: 'DELETE'
    });
  }

  async generateEmbeddings(keeperId: string, userId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/keepers/${keeperId}/memory-cards/generate-embeddings?userId=${userId}`, {
      method: 'POST'
    });
  }

  async searchMemoryCards(keeperId: string, query: string, userId: string): Promise<SoleMemoryCardListResponse> {
    return this.request<SoleMemoryCardListResponse>(`/keepers/${keeperId}/memory-cards/search?query=${encodeURIComponent(query)}&userId=${userId}`);
  }

  async assignEngagementTemplate(
    keeperId: string, 
    templateId: string, 
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/keepers/${keeperId}/engagement-templates/${templateId}?userId=${userId}`,
      {
        method: 'POST',
      }
    );
  }

  async getAgentKeeperTypes(agentId: string): Promise<KeeperTypeListResponse> {
    return this.request<KeeperTypeListResponse>(`/agents/${agentId}/keeper-types`);
  }

  async assignKeeperTypeToAgent(agentId: string, keeperTypeId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/agents/${agentId}/keeper-types/${keeperTypeId}`, {
      method: 'POST'
    });
  }

  async unassignKeeperTypeFromAgent(agentId: string, keeperTypeId: string): Promise<BaseResponse> {
    return this.request<BaseResponse>(`/agents/${agentId}/keeper-types/${keeperTypeId}`, {
      method: 'DELETE'
    });
  }
}

export const keeperApi = new KeeperApiService();
export default keeperApi; 