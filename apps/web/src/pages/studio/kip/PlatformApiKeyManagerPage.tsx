/**
 * Platform API Key Manager Page
 * =============================
 * 
 * Admin-level management for platform API keys that serve as fallbacks
 * when users don't provide their own keys
 */

import React, { useState, useEffect } from 'react';
import { ModelProvider } from '../../../types/kip';
import ApiKeyForm from '../../../components/ui/ApiKeyForm';
import HelpTooltip from '../../../components/ui/HelpTooltip';

interface PlatformKeyEntry {
  id: string;
  provider: string;
  maskedKey: string;
  label?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface KeyStats {
  total: number;
  active: number;
  byProvider: Record<string, { total: number; active: number }>;
  hasActiveKeys: boolean;
  warning?: string | null;
}

const PlatformApiKeyManagerPage: React.FC = () => {
  const [keys, setKeys] = useState<PlatformKeyEntry[]>([]);
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const providerInfo = {
    openai: {
      name: 'OpenAI',
      description: 'GPT models (GPT-4o, GPT-4 Turbo, etc.)',
      icon: '🤖',
      cost: 'High',
      documentation: 'https://platform.openai.com/docs/api-reference'
    },
    anthropic: {
      name: 'Anthropic',
      description: 'Claude models (Claude 3.5 Sonnet, etc.)',
      icon: '🧠',
      cost: 'High',
      documentation: 'https://docs.anthropic.com/claude/reference'
    },
    together: {
      name: 'Together AI',
      description: 'Open-source models (Llama, Mixtral)',
      icon: '🔗',
      cost: 'Medium',
      documentation: 'https://docs.together.ai/docs'
    },
    elevenlabs: {
      name: 'ElevenLabs',
      description: 'Voice synthesis and speech',
      icon: '🎙️',
      cost: 'Medium',
      documentation: 'https://elevenlabs.io/docs/api-reference'
    }
  };

  const allProviders: ModelProvider[] = ['openai', 'anthropic', 'together', 'elevenlabs'];

  useEffect(() => {
    loadPlatformKeys();
  }, []);

  const loadPlatformKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔑 Loading platform API keys...');
      const response = await fetch('/api/kip/platform-keys', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-user-id' // This should come from auth context
        }
      });
      
      console.log('📡 Platform keys response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Platform keys API error:', errorText);
        throw new Error(`Failed to load platform keys: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Platform keys data:', data);
      
      if (data.success) {
        setKeys(data.data.keys || []);
        setStats(data.data.stats || null);
      } else {
        throw new Error(data.error || 'Failed to load platform keys');
      }
    } catch (err) {
      console.error('Error loading platform keys:', err);
      setError(`Failed to load platform API keys: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Show empty state for development
      setKeys([]);
      setStats({ total: 0, active: 0, byProvider: {}, hasActiveKeys: false });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (provider: ModelProvider, apiKey: string, label?: string) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/kip/platform-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin-user-id'
        },
        body: JSON.stringify({ 
          provider, 
          api_key: apiKey,
          label: label || undefined,
          is_active: true 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save platform key');
      }
      
      setSuccess(data.message || `Successfully added ${providerInfo[provider].name} platform key!`);
      setShowAddForm(false);
      setEditingProvider(null);
      await loadPlatformKeys();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding platform key:', err);
      setError(err instanceof Error ? err.message : 'Failed to save platform key. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: ModelProvider) => {
    if (!confirm(`Are you sure you want to delete the ${providerInfo[provider].name} platform key?`)) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`/api/kip/platform-keys/${provider}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'admin-user-id'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete platform key');
      }
      
      setSuccess(data.message || `Successfully deleted ${providerInfo[provider].name} platform key!`);
      await loadPlatformKeys();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting platform key:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete platform key. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformKey = (provider: ModelProvider) => {
    return keys.find(key => key.provider === provider);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading platform API keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Platform API Keys</h1>
        <p className="text-muted-foreground">
          Manage platform-level API keys that serve as fallbacks when users don't provide their own personal keys.
          These keys are shared across all users and managed by system administrators.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">ℹ️</span>
            <h3 className="font-semibold text-blue-800">Platform vs Personal Keys</h3>
          </div>
          <p className="text-sm text-blue-700">
            <strong>Platform Keys:</strong> Shared fallback keys managed here by administrators<br/>
            <strong>Personal Keys:</strong> Individual user keys managed in their Root Dashboard → API Keys
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-background border border-input rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Keys</h3>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-background border border-input rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Active Keys</h3>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-background border border-input rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Providers</h3>
            <p className="text-2xl font-bold text-foreground">{Object.keys(stats.byProvider).length}</p>
          </div>
          <div className="bg-background border border-input rounded-lg p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <div className="flex items-center gap-2">
              {stats.hasActiveKeys ? (
                <>
                  <span className="text-2xl">✅</span>
                  <span className="text-lg font-bold text-green-600">Healthy</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">⚠️</span>
                  <span className="text-lg font-bold text-yellow-600">Warning</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.hasActiveKeys 
                ? 'Platform fallback keys available'
                : 'No platform fallback keys configured'
              }
            </p>
          </div>
        </div>
      )}

      {/* Warning if no active keys */}
      {stats && !stats.hasActiveKeys && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <p className="text-sm text-yellow-600 font-medium">
                No active platform keys configured
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Users without personal API keys will receive mock responses. Add platform keys to provide real AI responses as fallbacks.
              </p>
            </div>
          </div>
        </div>
      )}

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
          <h2 className="text-xl font-semibold mb-4">Add Platform API Key</h2>
          <ApiKeyForm
            onSubmit={(provider, apiKey, label) => handleAddKey(provider, apiKey, label)}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={submitting}
            showLabel={true}
          />
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-6">
        {allProviders.map((provider) => {
          const platformKey = getPlatformKey(provider);
          const info = providerInfo[provider];
          
          return (
            <div key={provider} className="border border-input rounded-lg p-6 bg-background">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      {info.name}
                      <HelpTooltip content={`${info.description}. Cost tier: ${info.cost}.`} />
                    </h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {platformKey ? (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      platformKey.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {platformKey.is_active ? '✅ Active' : '⏸️ Inactive'}
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      ❌ No Key
                    </span>
                  )}
                </div>
              </div>

              {/* Key Display/Actions */}
              {platformKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                      {platformKey.maskedKey}
                    </code>
                    {platformKey.label && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {platformKey.label}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteKey(provider)}
                      className="px-3 py-2 text-sm text-destructive hover:text-destructive/80 border border-input rounded hover:border-destructive/50"
                      disabled={submitting}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No platform key configured for {info.name}.
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-3 py-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded"
                    disabled={submitting}
                  >
                    Add {info.name} Key
                  </button>
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
            Add New Platform API Key
          </button>
        </div>
      )}
    </div>
  );
};

export default PlatformApiKeyManagerPage; 