/**
 * API Key Form Component
 * ======================
 * 
 * Shared form component for managing API keys across platform and user contexts
 */

import React, { useState } from 'react';
import { ModelProvider } from '../../types/kip';
import HelpTooltip from './HelpTooltip';

interface ApiKeyFormProps {
  provider?: ModelProvider;
  existingKey?: string;
  isEditing?: boolean;
  onSubmit: (provider: ModelProvider, apiKey: string, label?: string) => void;
  onCancel: () => void;
  showLabel?: boolean; // For platform-level keys
  existingLabel?: string;
  isSubmitting?: boolean;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({
  provider: initialProvider,
  existingKey,
  isEditing = false,
  onSubmit,
  onCancel,
  showLabel = false,
  existingLabel,
  isSubmitting = false
}) => {
  const [provider, setProvider] = useState<ModelProvider>(initialProvider || 'openai');
  const [apiKey, setApiKey] = useState(existingKey || '');
  const [label, setLabel] = useState(existingLabel || '');
  const [showKey, setShowKey] = useState(false);

  const providerOptions = [
    { 
      value: 'openai' as ModelProvider, 
      label: 'OpenAI', 
      description: 'GPT models - Get your key from platform.openai.com',
      keyFormat: 'sk-...', 
      placeholder: 'sk-1234567890abcdef...'
    },
    { 
      value: 'anthropic' as ModelProvider, 
      label: 'Anthropic', 
      description: 'Claude models - Get your key from console.anthropic.com',
      keyFormat: 'sk-ant-...', 
      placeholder: 'sk-ant-api03-1234567890abcdef...'
    },
    { 
      value: 'together-ai' as ModelProvider, 
      label: 'Together AI', 
      description: 'Open-source models - Get your key from api.together.xyz',
      keyFormat: 'api_key', 
      placeholder: 'your-together-api-key...'
    },
    { 
      value: 'elevenlabs' as ModelProvider, 
      label: 'ElevenLabs', 
      description: 'Voice synthesis - Get your key from elevenlabs.io',
      keyFormat: 'api_key', 
      placeholder: 'your-elevenlabs-api-key...'
    }
  ];

  const selectedProviderInfo = providerOptions.find(opt => opt.value === provider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    
    onSubmit(provider, apiKey.trim(), showLabel ? label.trim() : undefined);
  };

  const validateKey = (key: string, providerType: ModelProvider): boolean => {
    if (!key.trim()) return false;
    
    switch (providerType) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 20;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 30;
      case 'together-ai':
      case 'elevenlabs':
        return key.length > 10;
      default:
        return key.length > 5;
    }
  };

  const isValid = validateKey(apiKey, provider);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Provider Selection */}
      {!isEditing && (
        <div>
          <label htmlFor="provider" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Provider *
            <HelpTooltip content="Choose the AI provider for this API key. Each provider offers different models and pricing structures." />
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as ModelProvider)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
            disabled={isSubmitting}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedProviderInfo?.description}
          </p>
        </div>
      )}

      {/* Label Field (for platform keys) */}
      {showLabel && (
        <div>
          <label htmlFor="label" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
            Label
            <HelpTooltip content="Optional label to help identify this key, like 'Primary OpenAI Key' or 'Development Account'." />
          </label>
          <input
            type="text"
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="e.g., Primary Production Key"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* API Key Field */}
      <div>
        <label htmlFor="apiKey" className="flex items-center gap-1 text-sm font-medium text-foreground mb-2">
          API Key *
          <HelpTooltip content={`Enter your ${selectedProviderInfo?.label} API key. This should start with ${selectedProviderInfo?.keyFormat}. Keys are encrypted and never displayed in plain text after saving.`} />
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 pr-10 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:border-ring ${
              apiKey && !isValid 
                ? 'border-destructive bg-destructive/5' 
                : 'border-input bg-background'
            }`}
            placeholder={selectedProviderInfo?.placeholder}
            disabled={isSubmitting}
            required
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isSubmitting}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        
        {/* Validation feedback */}
        {apiKey && !isValid && (
          <p className="text-xs text-destructive mt-1">
            Invalid format. Expected format: {selectedProviderInfo?.keyFormat}
          </p>
        )}
        
        {apiKey && isValid && (
          <p className="text-xs text-green-600 mt-1">
            ✓ Valid key format
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md transition-colors"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Key' : 'Add Key'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ApiKeyForm; 