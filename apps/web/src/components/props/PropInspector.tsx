/**
 * PropInspector Component
 * =======================
 * 
 * Right-hand panel for editing prop configurations. Opens when a prop's
 * edit button is clicked. For heavy props like Image Gallery, can escalate
 * to a modal for better UX.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../../features/board-studio/v0/components/ui/button';
import { Input } from '../../features/board-studio/v0/components/ui/input';
import { Textarea } from '../../features/board-studio/v0/components/ui/textarea';
import { Label } from '../../features/board-studio/v0/components/ui/label';
import { Switch } from '../../features/board-studio/v0/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../features/board-studio/v0/components/ui/select';
import { ScrollArea } from '../../features/board-studio/v0/components/ui/scroll-area';
import { cn } from '../../features/board-studio/v0/lib/utils';

interface PropInspectorProps {
  /** The prop being edited */
  prop: {
    id: string;
    type: string;
    config: Record<string, any>;
    isVisible?: boolean;
    isDraft?: boolean;
  } | null;
  /** Whether the inspector is open */
  isOpen: boolean;
  /** Callback when inspector is closed */
  onClose: () => void;
  /** Callback when prop config is updated */
  onUpdate: (propId: string, config: Record<string, any>) => void;
  /** Callback when escalating to modal for heavy props */
  onEscalateToModal?: (propId: string) => void;
  /** Custom className */
  className?: string;
}

// Define which prop types should escalate to modal for better UX
const HEAVY_PROP_TYPES = ['gallery', 'media', 'form'];

export const PropInspector: React.FC<PropInspectorProps> = ({
  prop,
  isOpen,
  onClose,
  onUpdate,
  onEscalateToModal,
  className
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update local config when prop changes
  useEffect(() => {
    if (prop) {
      setLocalConfig({ ...prop.config });
      setHasChanges(false);
      setValidationErrors({});
    }
  }, [prop]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    setHasChanges(true);
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const validateConfig = (): boolean => {
    if (!prop) return false;
    
    const errors: Record<string, string> = {};
    
    // Basic validation based on prop type
    switch (prop.type) {
      case 'text':
        if (!localConfig.content?.trim()) {
          errors.content = 'Content is required';
        }
        break;
      case 'heading':
        if (!localConfig.content?.trim()) {
          errors.content = 'Heading text is required';
        }
        break;
      case 'image':
        if (!localConfig.url?.trim()) {
          errors.url = 'Image URL is required';
        }
        break;
      case 'button':
        if (!localConfig.label?.trim()) {
          errors.label = 'Button text is required';
        }
        break;
      case 'quote':
        if (!localConfig.content?.trim()) {
          errors.content = 'Quote text is required';
        }
        break;
      case 'token':
        if (!localConfig.name?.trim()) {
          errors.name = 'Token name is required';
        }
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!prop) return;
    
    setIsValidating(true);
    
    if (validateConfig()) {
      try {
        await onUpdate(prop.id, localConfig);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to update prop:', error);
        // Handle error (could show toast notification)
      }
    }
    
    setIsValidating(false);
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setLocalConfig(prop?.config || {});
        setHasChanges(false);
        setValidationErrors({});
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleEscalate = () => {
    if (prop && onEscalateToModal) {
      onEscalateToModal(prop.id);
    }
  };

  const renderConfigFields = () => {
    if (!prop) return null;

    switch (prop.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={localConfig.content || ''}
                onChange={(e) => handleConfigChange('content', e.target.value)}
                placeholder="Enter text content..."
                className={cn(
                  "min-h-[100px]",
                  validationErrors.content ? 'border-red-500' : ''
                )}
                rows={4}
              />
              {validationErrors.content && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.content}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Supports basic markdown formatting
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fontSize">Font Size</Label>
                <Select
                  value={localConfig.fontSize || 'medium'}
                  onValueChange={(value) => handleConfigChange('fontSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">Extra Small</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="xl">Extra Large</SelectItem>
                    <SelectItem value="2xl">2X Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="textAlign">Alignment</Label>
                <Select
                  value={localConfig.textAlign || 'left'}
                  onValueChange={(value) => handleConfigChange('textAlign', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="justify">Justify</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Text Style</Label>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="bold"
                    checked={localConfig.bold || false}
                    onCheckedChange={(checked) => handleConfigChange('bold', checked)}
                  />
                  <Label htmlFor="bold">Bold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="italic"
                    checked={localConfig.italic || false}
                    onCheckedChange={(checked) => handleConfigChange('italic', checked)}
                  />
                  <Label htmlFor="italic">Italic</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="underline"
                    checked={localConfig.underline || false}
                    onCheckedChange={(checked) => handleConfigChange('underline', checked)}
                  />
                  <Label htmlFor="underline">Underline</Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="textColor"
                  type="color"
                  value={localConfig.textColor || '#000000'}
                  onChange={(e) => handleConfigChange('textColor', e.target.value)}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={localConfig.textColor || '#000000'}
                  onChange={(e) => handleConfigChange('textColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">Image URL *</Label>
              <Input
                id="url"
                value={localConfig.url || ''}
                onChange={(e) => handleConfigChange('url', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={validationErrors.url ? 'border-red-500' : ''}
              />
              {validationErrors.url && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.url}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Direct link to image file (jpg, png, gif, webp)
              </p>
            </div>
            
            <div>
              <Label htmlFor="alt">Alt Text</Label>
              <Input
                id="alt"
                value={localConfig.alt || ''}
                onChange={(e) => handleConfigChange('alt', e.target.value)}
                placeholder="Describe the image for accessibility..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Important for screen readers and SEO
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="size">Size</Label>
                <Select
                  value={localConfig.size || 'medium'}
                  onValueChange={(value) => handleConfigChange('size', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thumbnail">Thumbnail</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="full">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="borderRadius">Border Radius</Label>
                <Select
                  value={localConfig.borderRadius || 'none'}
                  onValueChange={(value) => handleConfigChange('borderRadius', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="full">Circle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Display Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="shadow"
                    checked={localConfig.shadow || false}
                    onCheckedChange={(checked) => handleConfigChange('shadow', checked)}
                  />
                  <Label htmlFor="shadow">Drop shadow</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="border"
                    checked={localConfig.border || false}
                    onCheckedChange={(checked) => handleConfigChange('border', checked)}
                  />
                  <Label htmlFor="border">Border</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="lazy"
                    checked={localConfig.lazy !== false}
                    onCheckedChange={(checked) => handleConfigChange('lazy', checked)}
                  />
                  <Label htmlFor="lazy">Lazy loading</Label>
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {localConfig.url && (
              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                  <img
                    src={localConfig.url}
                    alt={localConfig.alt || 'Preview'}
                    className="max-w-full h-auto max-h-32 rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = 'block';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Button Label</Label>
              <Input
                id="label"
                value={localConfig.label || ''}
                onChange={(e) => handleConfigChange('label', e.target.value)}
                placeholder="Click me"
                className={validationErrors.label ? 'border-red-500' : ''}
              />
              {validationErrors.label && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.label}</p>
              )}
            </div>

            <div>
              <Label htmlFor="action">Action URL</Label>
              <Input
                id="action"
                value={localConfig.action || ''}
                onChange={(e) => handleConfigChange('action', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="variant">Style</Label>
              <Select
                value={localConfig.variant || 'primary'}
                onValueChange={(value) => handleConfigChange('variant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'token':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Token Name</Label>
              <Input
                id="name"
                value={localConfig.name || ''}
                onChange={(e) => handleConfigChange('name', e.target.value)}
                placeholder="AI Assistant"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="persona">Persona</Label>
              <Textarea
                id="persona"
                value={localConfig.persona || ''}
                onChange={(e) => handleConfigChange('persona', e.target.value)}
                placeholder="Describe the AI's personality and role..."
              />
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={localConfig.color || '#3b82f6'}
                onChange={(e) => handleConfigChange('color', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="size">Size</Label>
              <Select
                value={localConfig.size || 'medium'}
                onValueChange={(value) => handleConfigChange('size', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Heading Text *</Label>
              <Input
                id="content"
                value={localConfig.content || ''}
                onChange={(e) => handleConfigChange('content', e.target.value)}
                placeholder="Enter heading text..."
                className={validationErrors.content ? 'border-red-500' : ''}
              />
              {validationErrors.content && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.content}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="level">Heading Level</Label>
                <Select
                  value={String(localConfig.level || 2)}
                  onValueChange={(value) => handleConfigChange('level', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">H1 (Largest)</SelectItem>
                    <SelectItem value="2">H2</SelectItem>
                    <SelectItem value="3">H3</SelectItem>
                    <SelectItem value="4">H4</SelectItem>
                    <SelectItem value="5">H5</SelectItem>
                    <SelectItem value="6">H6 (Smallest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="alignment">Alignment</Label>
                <Select
                  value={localConfig.alignment || 'left'}
                  onValueChange={(value) => handleConfigChange('alignment', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Button Text *</Label>
              <Input
                id="label"
                value={localConfig.label || ''}
                onChange={(e) => handleConfigChange('label', e.target.value)}
                placeholder="Enter button text..."
                className={validationErrors.label ? 'border-red-500' : ''}
              />
              {validationErrors.label && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.label}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="action">Action URL</Label>
              <Input
                id="action"
                value={localConfig.action || ''}
                onChange={(e) => handleConfigChange('action', e.target.value)}
                placeholder="https://example.com or /path"
              />
              <p className="text-xs text-gray-500 mt-1">
                Where to navigate when clicked
              </p>
            </div>
            
            <div>
              <Label htmlFor="variant">Style</Label>
              <Select
                value={localConfig.variant || 'primary'}
                onValueChange={(value) => handleConfigChange('variant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary (Blue)</SelectItem>
                  <SelectItem value="secondary">Secondary (Gray)</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">Quote Text *</Label>
              <Textarea
                id="content"
                value={localConfig.content || ''}
                onChange={(e) => handleConfigChange('content', e.target.value)}
                placeholder="Enter quote text..."
                className={cn(
                  "min-h-[80px]",
                  validationErrors.content ? 'border-red-500' : ''
                )}
                rows={3}
              />
              {validationErrors.content && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.content}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={localConfig.author || ''}
                onChange={(e) => handleConfigChange('author', e.target.value)}
                placeholder="Quote author (optional)"
              />
            </div>
            
            <div>
              <Label htmlFor="style">Quote Style</Label>
              <Select
                value={localConfig.style || 'default'}
                onValueChange={(value) => handleConfigChange('style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="bordered">Bordered</SelectItem>
                  <SelectItem value="highlighted">Highlighted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="submitLabel">Submit Button Text</Label>
              <Input
                id="submitLabel"
                value={localConfig.submitLabel || ''}
                onChange={(e) => handleConfigChange('submitLabel', e.target.value)}
                placeholder="Submit"
              />
            </div>
            
            <div>
              <Label htmlFor="action">Form Action URL</Label>
              <Input
                id="action"
                value={localConfig.action || ''}
                onChange={(e) => handleConfigChange('action', e.target.value)}
                placeholder="https://example.com/submit"
              />
              <p className="text-xs text-gray-500 mt-1">
                Where to send form data
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Form fields can be configured in the advanced modal editor.
                Click "Open Advanced Editor" below to manage form fields.
              </p>
            </div>
          </div>
        );

      case 'ai-assistant':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="greeting">Greeting Message</Label>
              <Textarea
                id="greeting"
                value={localConfig.greeting || ''}
                onChange={(e) => handleConfigChange('greeting', e.target.value)}
                placeholder="Hello! How can I help you?"
                className="min-h-[60px]"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="agentId">AI Agent</Label>
              <Input
                id="agentId"
                value={localConfig.agentId || ''}
                onChange={(e) => handleConfigChange('agentId', e.target.value)}
                placeholder="Select or enter agent ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Which AI agent to use for conversations
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="showAvatar"
                checked={localConfig.showAvatar !== false}
                onCheckedChange={(checked) => handleConfigChange('showAvatar', checked)}
              />
              <Label htmlFor="showAvatar">Show avatar</Label>
            </div>
          </div>
        );

      case 'smart-suggestions':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxSuggestions">Max Suggestions</Label>
              <Input
                id="maxSuggestions"
                type="number"
                min="1"
                max="10"
                value={localConfig.maxSuggestions || 3}
                onChange={(e) => handleConfigChange('maxSuggestions', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={localConfig.category || 'general'}
                onValueChange={(value) => handleConfigChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={localConfig.autoRefresh || false}
                onCheckedChange={(checked) => handleConfigChange('autoRefresh', checked)}
              />
              <Label htmlFor="autoRefresh">Auto-refresh suggestions</Label>
            </div>
          </div>
        );

      case 'image-slider':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Image Slider Configuration</strong><br/>
                Use the advanced modal editor to manage slider images and settings.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="autoPlay"
                checked={localConfig.autoPlay !== false}
                onCheckedChange={(checked) => handleConfigChange('autoPlay', checked)}
              />
              <Label htmlFor="autoPlay">Auto-play slides</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="showDots"
                checked={localConfig.showDots !== false}
                onCheckedChange={(checked) => handleConfigChange('showDots', checked)}
              />
              <Label htmlFor="showDots">Show navigation dots</Label>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Configuration for "{prop.type}" prop type is not yet implemented.</p>
            <p className="text-sm mt-2">This prop can still be used, but advanced configuration is limited.</p>
          </div>
        );
    }
  };

  const isHeavyProp = prop && HEAVY_PROP_TYPES.includes(prop.type);

  return (
    <AnimatePresence>
      {isOpen && prop && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg z-50",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Prop
              </h3>
              {isHeavyProp && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEscalate}
                  className="p-1"
                  title="Open in modal for better editing experience"
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <XMarkIcon className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
            <div className="p-4">
              {/* Prop Info */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-1">
                  {prop.type.charAt(0).toUpperCase() + prop.type.slice(1)} Prop
                </h4>
                <p className="text-sm text-gray-600">
                  Configure the settings for this prop
                </p>
              </div>

              {/* Configuration Fields */}
              {renderConfigFields()}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-sm text-amber-600 flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Unsaved changes
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || isValidating}
                  className="min-w-[80px]"
                >
                  {isValidating ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PropInspector;
