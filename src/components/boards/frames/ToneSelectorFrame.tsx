/**
 * ToneSelectorFrame Component
 * 
 * Frame for configuring agent communication tone and style.
 * Used in Agent Board for defining how the agent communicates.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { FrameProps } from '../../../types/board';

interface ToneData {
  primary: string;
  secondary?: string;
  formality: 'casual' | 'professional' | 'formal';
  enthusiasm: 'low' | 'medium' | 'high';
  supportiveness: 'directive' | 'collaborative' | 'nurturing';
  customInstructions?: string;
}

const toneOptions = [
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { id: 'professional', label: 'Professional', description: 'Business-focused and competent' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and caring' },
  { id: 'analytical', label: 'Analytical', description: 'Logical and detail-oriented' },
  { id: 'creative', label: 'Creative', description: 'Imaginative and innovative' },
  { id: 'encouraging', label: 'Encouraging', description: 'Motivating and positive' },
  { id: 'direct', label: 'Direct', description: 'Clear and straightforward' },
  { id: 'patient', label: 'Patient', description: 'Calm and understanding' },
];

export const ToneSelectorFrame: React.FC<FrameProps> = ({
  instance,
  engagementMode,
  onUpdate,
  onAction,
}) => {
  const [tone, setTone] = useState<ToneData>({
    primary: 'friendly',
    formality: 'professional',
    enthusiasm: 'medium',
    supportiveness: 'collaborative',
    ...(instance.currentContent?.data as ToneData || {}),
  });

  useEffect(() => {
    if (instance.currentContent?.data) {
      setTone(prev => ({ ...prev, ...instance.currentContent.data }));
    }
  }, [instance.currentContent]);

  const handleUpdate = (field: keyof ToneData, value: any) => {
    const newTone = { ...tone, [field]: value };
    setTone(newTone);
    onUpdate?.(newTone);
  };

  const handleSave = () => {
    onAction?.('save', tone);
  };

  const isPreviewMode = engagementMode === 'preview';

  if (isPreviewMode) {
    const primaryTone = toneOptions.find(t => t.id === tone.primary);
    return (
      <div className="tone-selector-preview p-4 bg-card rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-card-foreground">
              {primaryTone?.label || 'Tone'} Style
            </h3>
            <p className="text-sm text-muted-foreground">
              {tone.formality} • {tone.enthusiasm} energy
            </p>
          </div>
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary text-sm">🎭</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="tone-selector-frame bg-card border border-border rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="space-y-6">
        <div className="frame-header">
          <h2 className="text-lg font-semibold text-card-foreground">Communication Tone</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define how your agent communicates and interacts
          </p>
        </div>

        <div className="tone-form space-y-6">
          {/* Primary Tone Selection */}
          <div className="primary-tone">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Primary Tone
            </label>
            <div className="grid grid-cols-2 gap-3">
              {toneOptions.map((option) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleUpdate('primary', option.id)}
                  className={`p-3 text-left border rounded-lg transition-all ${
                    tone.primary === option.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 text-card-foreground'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Secondary Tone */}
          <div className="secondary-tone">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Secondary Tone (Optional)
            </label>
            <select
              value={tone.secondary || ''}
              onChange={(e) => handleUpdate('secondary', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
            >
              <option value="">None</option>
              {toneOptions
                .filter(option => option.id !== tone.primary)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Formality Level */}
          <div className="formality-level">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Formality Level
            </label>
            <div className="flex space-x-2">
              {(['casual', 'professional', 'formal'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleUpdate('formality', level)}
                  className={`flex-1 py-2 px-3 text-sm rounded-md border transition-all ${
                    tone.formality === level
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 text-card-foreground'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Enthusiasm Level */}
          <div className="enthusiasm-level">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Enthusiasm Level
            </label>
            <div className="flex space-x-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => handleUpdate('enthusiasm', level)}
                  className={`flex-1 py-2 px-3 text-sm rounded-md border transition-all ${
                    tone.enthusiasm === level
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:border-primary/50 text-card-foreground'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Supportiveness Style */}
          <div className="supportiveness-style">
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Supportiveness Style
            </label>
            <div className="space-y-2">
              {([
                { id: 'directive', label: 'Directive', desc: 'Provides clear guidance and instructions' },
                { id: 'collaborative', label: 'Collaborative', desc: 'Works together to find solutions' },
                { id: 'nurturing', label: 'Nurturing', desc: 'Focuses on emotional support and encouragement' }
              ] as const).map((style) => (
                <label key={style.id} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="supportiveness"
                    value={style.id}
                    checked={tone.supportiveness === style.id}
                    onChange={() => handleUpdate('supportiveness', style.id)}
                    className="mt-1 text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium text-sm text-card-foreground">{style.label}</div>
                    <div className="text-xs text-muted-foreground">{style.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="custom-instructions">
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Custom Instructions (Optional)
            </label>
            <textarea
              placeholder="Add any specific communication preferences or instructions..."
              value={tone.customInstructions || ''}
              onChange={(e) => handleUpdate('customInstructions', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="frame-actions flex justify-between items-center pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Changes are saved automatically
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onAction?.('preview', tone)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Save Tone
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};