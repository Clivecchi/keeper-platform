/**
 * Token Placeholder Component - Phase 4 Implementation
 * Static placeholder for AI tokens (no runtime behavior)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  type TokenConfig,
  getTokenDisplaySize,
  getTokenDisplayName,
  getTokenAvatarFallback,
  validateTokenConfig
} from './schema';

// =============================================================================
// TYPES
// =============================================================================

interface TokenPlaceholderProps {
  config: TokenConfig;
  mode: 'edit' | 'layout' | 'preview';
  onUpdate?: (config: TokenConfig) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  className?: string;
}

interface TokenConfigSheetProps {
  config: TokenConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TokenConfig) => void;
}

// =============================================================================
// CONFIG SHEET COMPONENT
// =============================================================================

const TokenConfigSheet: React.FC<TokenConfigSheetProps> = ({
  config,
  isOpen,
  onClose,
  onSave
}) => {
  const [localConfig, setLocalConfig] = useState<TokenConfig>(config);

  const handleSave = () => {
    try {
      const validatedConfig = validateTokenConfig(localConfig);
      onSave(validatedConfig);
      onClose();
    } catch (error) {
      console.error('Invalid token config:', error);
    }
  };

  const handleFieldChange = (field: keyof TokenConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-medium text-gray-900">Configure AI Token</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={localConfig.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="AI Assistant"
                  maxLength={50}
                />
              </div>

              {/* Persona */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persona/Voice
                </label>
                <textarea
                  value={localConfig.persona || ''}
                  onChange={(e) => handleFieldChange('persona', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Describe the AI's personality and communication style..."
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={localConfig.avatarUrl || ''}
                  onChange={(e) => handleFieldChange('avatarUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              {/* Style Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style Note
                </label>
                <input
                  type="text"
                  value={localConfig.styleNote || ''}
                  onChange={(e) => handleFieldChange('styleNote', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Brief style or behavior note"
                  maxLength={100}
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localConfig.color}
                    onChange={(e) => handleFieldChange('color', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localConfig.color}
                    onChange={(e) => handleFieldChange('color', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="#6366F1"
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Size
                </label>
                <select
                  value={localConfig.size}
                  onChange={(e) => handleFieldChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="small">Small (32px)</option>
                  <option value="medium">Medium (48px)</option>
                  <option value="large">Large (64px)</option>
                </select>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Visible
                </label>
                <button
                  onClick={() => handleFieldChange('isVisible', !localConfig.isVisible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    localConfig.isVisible ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      localConfig.isVisible ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Token
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const TokenPlaceholder: React.FC<TokenPlaceholderProps> = ({
  config,
  mode,
  onUpdate,
  onDelete,
  isSelected = false,
  className = ''
}) => {
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const { width, height } = getTokenDisplaySize(config.size);
  const displayName = getTokenDisplayName(config);
  const avatarFallback = getTokenAvatarFallback(config);

  const handleConfigSave = (newConfig: TokenConfig) => {
    onUpdate?.(newConfig);
  };

  const handleClick = () => {
    if (mode === 'edit' || mode === 'layout') {
      setShowConfigSheet(true);
    }
  };

  if (!config.isVisible && mode === 'preview') {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={mode !== 'preview' ? { scale: 1.05 } : {}}
        className={`
          inline-flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all
          ${isSelected 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-200 bg-white hover:border-gray-300'
          }
          ${mode !== 'preview' ? 'cursor-pointer' : 'cursor-default'}
          ${className}
        `}
        onClick={handleClick}
        style={{
          borderColor: config.color + '40', // 25% opacity
          backgroundColor: config.color + '10' // 6% opacity
        }}
      >
        {/* Avatar */}
        <div
          className="rounded-full flex items-center justify-center text-white font-medium"
          style={{
            width,
            height,
            backgroundColor: config.color,
            fontSize: config.size === 'small' ? '12px' : config.size === 'large' ? '18px' : '14px'
          }}
        >
          {config.avatarUrl ? (
            <img
              src={config.avatarUrl}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (sib) sib.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ display: config.avatarUrl ? 'none' : 'flex' }}
          >
            {avatarFallback}
          </div>
        </div>

        {/* Name and Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {displayName}
          </div>
          {config.persona && (
            <div className="text-xs text-gray-500 truncate">
              {config.persona.slice(0, 30)}{config.persona.length > 30 ? '...' : ''}
            </div>
          )}
        </div>

        {/* Mode indicators */}
        {mode === 'edit' && (
          <div className="flex items-center space-x-1">
            <SparklesIcon className="w-4 h-4 text-purple-500" />
            <Cog6ToothIcon className="w-3 h-3 text-gray-400" />
          </div>
        )}

        {mode === 'layout' && (
          <div className="flex items-center space-x-1">
            {config.isVisible ? (
              <EyeIcon className="w-4 h-4 text-green-500" />
            ) : (
              <EyeSlashIcon className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}

        {mode === 'preview' && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="AI Token (Ready)" />
        )}
      </motion.div>

      {/* Config Sheet */}
      <TokenConfigSheet
        config={config}
        isOpen={showConfigSheet}
        onClose={() => setShowConfigSheet(false)}
        onSave={handleConfigSave}
      />
    </>
  );
};

export default TokenPlaceholder;
