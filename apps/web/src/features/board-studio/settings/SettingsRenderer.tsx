/**
 * Settings Renderer - Phase 2 Implementation
 * Schema-driven form renderer for Settings frame
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cog6ToothIcon,
  PaintBrushIcon,
  CubeIcon,
  ShareIcon,
  EyeIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { BoardSettingsSchema, FieldSpec, getValueByPath, setValueByPath, validateAllFields } from './schema';

// =============================================================================
// TYPES
// =============================================================================

interface BoardData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  theme: {
    primary?: string;
    background?: string;
  };
  behavior: {
    showGrid?: boolean;
    snapToGrid?: boolean;
    gridSize?: number;
    defaultPattern?: string;
    startFrameId?: string | null;
    draftMode?: boolean;
    autosave?: boolean;
  };
  data: {
    scope: string;
    entityId?: string | null;
    agentId?: string | null;
  };
  access: {
    visibility?: string;
    allowComments?: boolean;
    shareLinkEnabled?: boolean;
  };
}

interface SettingsRendererProps {
  board: BoardData;
  frames?: Array<{ id: string; name: string; role?: string }>;
  mode: 'edit' | 'preview';
  onSave?: (updates: Partial<BoardData>) => Promise<void>;
  onFieldChange?: (path: string, value: any) => void;
}

// =============================================================================
// FIELD COMPONENTS
// =============================================================================

const TextFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {field.type === 'textarea' ? (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.max}
        rows={3}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
      />
    ) : (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.max}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
      />
    )}
    {field.helper && (
      <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
    )}
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center">
        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const NumberFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type="number"
      value={value || ''}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      min={field.min}
      max={field.max}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
    />
    {field.helper && (
      <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
    )}
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center">
        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const ColorFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {field.label}
    </label>
    <div className="flex items-center space-x-3">
      <input
        type="color"
        value={value || '#3B82F6'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer disabled:cursor-not-allowed"
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#3B82F6"
        disabled={disabled}
        className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-50 text-gray-500' : ''
        }`}
      />
    </div>
    {field.helper && (
      <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
    )}
  </div>
);

const SwitchFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}> = ({ field, value, onChange, disabled }) => (
  <div className="flex items-center justify-between">
    <div>
      <label className="text-sm font-medium text-gray-700">
        {field.label}
      </label>
      {field.helper && (
        <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        value ? 'bg-blue-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const SelectFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      } ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
    >
      <option value="">Select an option</option>
      {field.options?.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
    {field.helper && (
      <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
    )}
    {error && (
      <p className="text-xs text-red-500 mt-1 flex items-center">
        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const SelectFrameFieldComponent: React.FC<{
  field: FieldSpec;
  value: any;
  onChange: (value: any) => void;
  frames?: Array<{ id: string; name: string; role?: string }>;
  disabled?: boolean;
}> = ({ field, value, onChange, frames = [], disabled }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {field.label}
    </label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        disabled ? 'bg-gray-50 text-gray-500' : ''
      }`}
    >
      <option value="">None (use first frame)</option>
      {frames.map((frame) => (
        <option key={frame.id} value={frame.id}>
          {frame.name} {frame.role && `(${frame.role})`}
        </option>
      ))}
    </select>
    {field.helper && (
      <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SettingsRenderer: React.FC<SettingsRendererProps> = ({
  board,
  frames = [],
  mode,
  onSave,
  onFieldChange
}) => {
  const [localData, setLocalData] = useState<BoardData>(board);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Update local data when board prop changes
  useEffect(() => {
    setLocalData(board);
  }, [board]);

  // Validate on data change
  useEffect(() => {
    const validationErrors = validateAllFields(localData);
    setErrors(validationErrors);
  }, [localData]);

  const handleFieldChange = (path: string, value: any) => {
    const newData = { ...localData };
    setValueByPath(newData, path, value);
    setLocalData(newData);
    
    // Notify parent of field change
    onFieldChange?.(path, value);
  };

  const handleSave = async () => {
    if (!onSave || Object.keys(errors).length > 0) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      await onSave(localData);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: FieldSpec) => {
    const value = getValueByPath(localData, field.path);
    const error = errors[field.path];
    const disabled = mode === 'preview' || field.disabled;

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <TextFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            error={error}
            disabled={disabled}
          />
        );
      case 'number':
        return (
          <NumberFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            error={error}
            disabled={disabled}
          />
        );
      case 'color':
        return (
          <ColorFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            disabled={disabled}
          />
        );
      case 'switch':
        return (
          <SwitchFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            disabled={disabled}
          />
        );
      case 'select':
        return (
          <SelectFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            error={error}
            disabled={disabled}
          />
        );
      case 'select-frame':
        return (
          <SelectFrameFieldComponent
            field={field}
            value={value}
            onChange={(newValue) => handleFieldChange(field.path, newValue)}
            frames={frames}
            disabled={disabled}
          />
        );
      case 'entity-picker':
      case 'agent-picker':
      case 'icon':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
              {field.type === 'entity-picker' && 'Entity picker - Coming soon'}
              {field.type === 'agent-picker' && 'Agent picker - Coming soon'}
              {field.type === 'icon' && 'Icon picker - Coming soon'}
            </div>
            {field.helper && (
              <p className="text-xs text-gray-500 mt-1">{field.helper}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getSectionIcon = (sectionKey: string) => {
    switch (sectionKey) {
      case 'General': return <Cog6ToothIcon className="w-5 h-5" />;
      case 'Theme': return <PaintBrushIcon className="w-5 h-5" />;
      case 'Behavior': return <CubeIcon className="w-5 h-5" />;
      case 'Scope': return <LinkIcon className="w-5 h-5" />;
      case 'Access': return <ShareIcon className="w-5 h-5" />;
      default: return <Cog6ToothIcon className="w-5 h-5" />;
    }
  };

  if (mode === 'preview') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <Cog6ToothIcon className="w-6 h-6 text-gray-400 mr-3" />
            <h3 className="text-lg font-medium text-gray-900">Board Settings</h3>
            <span className="ml-auto text-sm text-gray-500">Preview Mode</span>
          </div>
          
          <div className="text-center py-12 text-gray-500">
            <EyeIcon className="w-12 h-12 mx-auto mb-4" />
            <p>Settings form preview</p>
            <p className="text-sm mt-2">Switch to Edit mode to configure board settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cog6ToothIcon className="w-6 h-6 text-gray-400 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Board Settings</h3>
            </div>
            {mode === 'edit' && onSave && (
              <button
                onClick={handleSave}
                disabled={isSaving || Object.keys(errors).length > 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  saveStatus === 'saved' 
                    ? 'bg-green-100 text-green-700' 
                    : saveStatus === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && (
                  <span className="flex items-center">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Saved
                  </span>
                )}
                {saveStatus === 'error' && 'Error'}
                {saveStatus === 'idle' && 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          {Object.entries(BoardSettingsSchema).map(([sectionKey, section]) => (
            <motion.div
              key={sectionKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                {getSectionIcon(sectionKey)}
                <div>
                  <h4 className="text-base font-medium text-gray-900">{section.title}</h4>
                  {section.description && (
                    <p className="text-sm text-gray-500">{section.description}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map((field) => (
                  <div key={field.path} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsRenderer;
