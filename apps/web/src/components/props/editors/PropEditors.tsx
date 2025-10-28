/**
 * Prop Editors - Type-specific inline editors for props
 * 
 * Each prop type gets a custom editor component that allows
 * live editing of its configuration.
 */

import React from 'react';
import { Button } from '../../../features/board-studio/v0/components/ui/button';
import { Input } from '../../../features/board-studio/v0/components/ui/input';
import { Textarea } from '../../../features/board-studio/v0/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../features/board-studio/v0/components/ui/select';

interface BasePropEditorProps {
  config: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  onSave: () => void;
  onCancel: () => void;
}

// Text Prop Editor
export const TextPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Text Content</label>
        <Textarea
          value={config.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Enter your text here..."
          rows={3}
          className="w-full text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Font Size</label>
          <Select
            value={config.fontSize || 'medium'}
            onValueChange={(value) => onChange({ fontSize: value })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Style</label>
          <Select
            value={config.bold ? 'bold' : 'normal'}
            onValueChange={(value) => onChange({ bold: value === 'bold' })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Heading Prop Editor
export const HeadingPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Heading Text</label>
        <Input
          value={config.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Enter heading text..."
          className="text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Level</label>
          <Select
            value={String(config.level || 2)}
            onValueChange={(value) => onChange({ level: parseInt(value) })}
          >
            <SelectTrigger className="text-xs h-8">
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
          <label className="text-xs font-medium text-gray-700 mb-1 block">Alignment</label>
          <Select
            value={config.alignment || 'left'}
            onValueChange={(value) => onChange({ alignment: value })}
          >
            <SelectTrigger className="text-xs h-8">
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
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Quote Prop Editor
export const QuotePropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Quote Text</label>
        <Textarea
          value={config.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Enter quote text..."
          rows={3}
          className="w-full text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Author</label>
        <Input
          value={config.author || ''}
          onChange={(e) => onChange({ author: e.target.value })}
          placeholder="Author name (optional)"
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Style</label>
        <Select
          value={config.style || 'default'}
          onValueChange={(value) => onChange({ style: value })}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="bordered">Bordered</SelectItem>
            <SelectItem value="highlighted">Highlighted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Image/Gallery Prop Editor
export const ImagePropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Image URL</label>
        <Input
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Alt Text</label>
        <Input
          value={config.alt || ''}
          onChange={(e) => onChange({ alt: e.target.value })}
          placeholder="Describe the image..."
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Size</label>
        <Select
          value={config.size || 'large'}
          onValueChange={(value) => onChange({ size: value })}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="full">Full Width</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {config.url && (
        <div className="rounded overflow-hidden border border-gray-200">
          <img src={config.url} alt={config.alt || 'Preview'} className="w-full h-32 object-cover" />
          <div className="text-xs text-gray-500 p-2 bg-white">Preview</div>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Gallery Prop Editor
export const GalleryPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  const images = Array.isArray(config.images) ? config.images : [];
  
  const addImage = () => {
    const newImage = { url: '', alt: '' };
    onChange({ images: [...images, newImage] });
  };
  
  const removeImage = (index: number) => {
    onChange({ images: images.filter((_: any, i: number) => i !== index) });
  };
  
  const updateImage = (index: number, field: string, value: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ images: updated });
  };
  
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Gallery Name</label>
        <Input
          value={config.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Image Gallery"
          className="text-sm"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Layout</label>
          <Select
            value={config.layout || 'grid'}
            onValueChange={(value) => onChange({ layout: value })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="slider">Slider</SelectItem>
              <SelectItem value="masonry">Masonry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Columns</label>
          <Select
            value={String(config.columns || 3)}
            onValueChange={(value) => onChange({ columns: parseInt(value) })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Images ({images.length})</label>
          <Button onClick={addImage} variant="ghost" size="sm" className="text-xs h-6">
            + Add Image
          </Button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {images.map((img: any, index: number) => (
            <div key={index} className="p-2 bg-white rounded border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Image {index + 1}</span>
                <button
                  onClick={() => removeImage(index)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <Input
                value={img.url || ''}
                onChange={(e) => updateImage(index, 'url', e.target.value)}
                placeholder="Image URL"
                className="text-xs h-7 mb-1"
              />
              <Input
                value={img.alt || ''}
                onChange={(e) => updateImage(index, 'alt', e.target.value)}
                placeholder="Alt text"
                className="text-xs h-7"
              />
            </div>
          ))}
          
          {images.length === 0 && (
            <div className="text-center py-4 text-xs text-gray-500">
              No images yet. Click "Add Image" to start.
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Button Prop Editor
export const ButtonPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Button Label</label>
        <Input
          value={config.label || ''}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Click me"
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Action URL</label>
        <Input
          value={config.action || ''}
          onChange={(e) => onChange({ action: e.target.value })}
          placeholder="#"
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Variant</label>
        <Select
          value={config.variant || 'primary'}
          onValueChange={(value) => onChange({ variant: value })}
        >
          <SelectTrigger className="text-xs h-8">
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
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Form Prop Editor
export const FormPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  const fields = Array.isArray(config.fields) ? config.fields : [];
  
  const addField = () => {
    onChange({ fields: [...fields, { label: '', type: 'text', placeholder: '' }] });
  };
  
  const removeField = (index: number) => {
    onChange({ fields: fields.filter((_: any, i: number) => i !== index) });
  };
  
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Form Name</label>
        <Input
          value={config.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Form"
          className="text-sm"
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Fields ({fields.length})</label>
          <Button onClick={addField} variant="ghost" size="sm" className="text-xs h-6">
            + Add Field
          </Button>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {fields.map((field: any, index: number) => (
            <div key={index} className="p-2 bg-white rounded border border-gray-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500">Field {index + 1}</span>
                <button
                  onClick={() => removeField(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <div className="text-gray-600">
                {field.label || 'Untitled field'} ({field.type || 'text'})
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Submit Button Text</label>
        <Input
          value={config.submitLabel || ''}
          onChange={(e) => onChange({ submitLabel: e.target.value })}
          placeholder="Submit"
          className="text-sm"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// AI Assistant Prop Editor
export const AIAssistantPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Display Name</label>
        <Input
          value={config.displayName || config.name || ''}
          onChange={(e) => onChange({ displayName: e.target.value })}
          placeholder="AI Assistant"
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Greeting Message</label>
        <Textarea
          value={config.greeting || config.personaNote || ''}
          onChange={(e) => onChange({ greeting: e.target.value })}
          placeholder="Hello! How can I help you?"
          rows={2}
          className="text-sm"
        />
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Avatar URL</label>
        <Input
          value={config.avatarUrl || ''}
          onChange={(e) => onChange({ avatarUrl: e.target.value })}
          placeholder="/placeholder.svg"
          className="text-sm"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Media (Video) Prop Editor
export const MediaPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Media Type</label>
        <Select
          value={config.type || 'video'}
          onValueChange={(value) => onChange({ type: value })}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Media URL</label>
        <Input
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://example.com/video.mp4"
          className="text-sm"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="autoplay"
          checked={config.autoplay || false}
          onChange={(e) => onChange({ autoplay: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="autoplay" className="text-xs text-gray-700">
          Autoplay
        </label>
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// Default/Generic Prop Editor (fallback)
export const GenericPropEditor: React.FC<BasePropEditorProps> = ({ config, onChange, onSave, onCancel }) => {
  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded border border-gray-200">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Configuration (JSON)</label>
        <Textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              // Invalid JSON, don't update
            }
          }}
          rows={6}
          className="text-xs font-mono"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs h-7">
          Cancel
        </Button>
        <Button onClick={onSave} size="sm" className="text-xs h-7">
          Save Changes
        </Button>
      </div>
    </div>
  );
};

