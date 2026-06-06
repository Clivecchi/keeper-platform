/**
 * User API Key Manager Page
 * =========================
 * 
 * Allows individual users to manage their personal API keys for AI providers
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ModelProvider, UserApiKey } from '../../types/kip';
import ApiKeyForm from '../../components/ui/ApiKeyForm';
import HelpTooltip from '../../components/ui/HelpTooltip';

interface ApiKeyEntry extends UserApiKey {
  isActive: boolean;
}

const UserApiKeyManagerPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<ModelProvider>>(new Set());

  const providerInfo = {
    openai: {
      name: 'OpenAI',
      description: 'GPT models (GPT-4o, GPT-4 Turbo, etc.)',
      icon: '🤖',
      cost: '$$',
      getKeyUrl: 'https://platform.openai.com/api-keys'
    },
    anthropic: {
      name: 'Anthropic',
      description: 'Claude models (Claude 3.5 Sonnet, etc.)',
      icon: '🧠',
      cost: '$$',
      getKeyUrl: 'https://console.anthropic.com/'
    },
    'together-ai': {
      name: 'Together AI',
      description: 'Open-source models (Llama, Mixtral)',
      icon: '🔗',
      cost: '$',
      getKeyUrl: 'https://api.together.xyz/settings/api-keys'
    },
    elevenlabs: {
      name: 'ElevenLabs',
      description: 'Voice synthesis and speech',
      icon: '🎙️',
      cost: '$',
      getKeyUrl: 'https://elevenlabs.io/app/speech-synthesis'
    }
  };

  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'together-ai', 'elevenlabs'];

  useEffect(() => {
    loadUserKeys();
  }, []);

  const loadUserKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock API call - replace with actual API
      const response = await api.get('api/kip/user-keys', { headers: { 'x-user-id': 'current-user-id' } });
      
      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }
      
      const data = await response.json();
      
      // Transform data to include active status
      const userKeys: ApiKeyEntry[] = data.data.map((key: UserApiKey) => ({
        ...key,
        isActive: true // User keys are always active when present
      }));
      
      setKeys(userKeys);
    } catch (err) {
      console.error('Error loading user keys:', err);
      setError('Failed to load your API keys. Please try again.');
      // Show mock data for development
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (provider: ModelProvider, apiKey: string) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await api.post('api/kip/user-keys', { provider, apiKey }, { headers: { 'x-user-id': 'current-user-id' } });
      
      if (!response.ok) {
        throw new Error('Failed to save API key');
      }
      
      setSuccess(`Successfully added ${providerInfo[provider].name} API key!`);
      setShowAddForm(false);
      await loadUserKeys();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding key:', err);
      setError('Failed to save API key. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: ModelProvider) => {
    if (!confirm(`Are you sure you want to delete your ${providerInfo[provider].name} API key?`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(new URL(`api/kip/user-keys/${provider}`, (import.meta as any).env.VITE_API_URL).toString(), {
        method: 'DELETE',
        headers: { 'x-user-id': 'current-user-id' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }
      
      setSuccess(`Successfully deleted ${providerInfo[provider].name} API key!`);
      await loadUserKeys();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting key:', err);
      setError('Failed to delete API key. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleKeyVisibility = (provider: ModelProvider) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(provider)) {
      newRevealed.delete(provider);
    } else {
      newRevealed.add(provider);
    }
    setRevealedKeys(newRevealed);
  };

  const getUserKey = (provider: ModelProvider) => {
    return keys.find(key => key.provider === provider);
  };

  const hasUserKey = (provider: ModelProvider) => {
    return !!getUserKey(provider);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your API keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Your API Keys</h1>
        <p className="text-muted-foreground">
          Manage your personal AI provider API keys. When you provide your own keys, you'll have direct control over costs and usage.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Add Key Form */}
      {showAddForm && (
        <div className="mb-8 p-6 border border-input rounded-lg bg-background">
          <h2 className="text-xl font-semibold mb-4">Add API Key</h2>
          <ApiKeyForm
            onSubmit={(provider, apiKey) => handleAddKey(provider, apiKey)}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={submitting}
            showLabel={false}
          />
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-6">
        {allProviders.map((provider) => {
          const userKey = getUserKey(provider);
          const info = providerInfo[provider];
          const isRevealed = revealedKeys.has(provider);
          
          return (
            <div key={provider} className="border border-input rounded-lg p-6 bg-background">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {info.name}
                      <HelpTooltip content={`${info.description}. Cost tier: ${info.cost}. Click to get your API key from their official website.`} />
                    </h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {userKey ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      🔑 Using personal key
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      🏢 Falling back to platform key
                    </span>
                  )}
                </div>
              </div>

              {/* Key Display/Actions */}
              {userKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                      {isRevealed ? userKey.maskedKey.replace(/\*/g, '•') : userKey.maskedKey}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(provider)}
                      className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded"
                      disabled={submitting}
                    >
                      {isRevealed ? '🙈 Hide' : '👁️ Show'}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(provider)}
                      className="px-3 py-2 text-sm text-destructive hover:text-destructive/80 border border-input rounded hover:border-destructive/50"
                      disabled={submitting}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your agents will use this key for {info.name} models, giving you direct control over costs and usage.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No personal key configured. Agents will use the platform's shared key for {info.name} models.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddForm(true);
                        // Could pre-select this provider
                      }}
                      className="px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded"
                      disabled={submitting}
                    >
                      Add {info.name} Key
                    </button>
                    <a
                      href={info.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 text-sm border border-input text-foreground hover:bg-accent rounded"
                    >
                      Get API Key ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      {!showAddForm && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            disabled={submitting}
          >
            Add New API Key
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          How Personal API Keys Work
          <HelpTooltip content="Personal API keys give you direct control over AI costs and usage while providing enhanced privacy for your agents." />
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Cost Control:</strong> Usage is billed directly to your provider account</p>
          <p>• <strong>Privacy:</strong> Your requests go directly to the provider, not through platform logs</p>
          <p>• <strong>Priority:</strong> Your personal keys always take precedence over platform keys</p>
          <p>• <strong>Fallback:</strong> If no personal key is set, agents use the platform's shared keys</p>
          <p>• <strong>Security:</strong> Keys are encrypted and never displayed in full after saving</p>
        </div>
      </div>
    </div>
  );
};

export default UserApiKeyManagerPage; 