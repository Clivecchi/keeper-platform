/**
 * EngagementModal
 * Modal dialog for engagement template forms
 * 
 * Features:
 * - Dynamically renders fields based on template definition
 * - Pre-fills values from dataSource if available
 * - Validates inputs before submission
 * - Shows loading state during execution
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../features/board-studio/v0/components/ui/dialog';
import { Input } from '../../features/board-studio/v0/components/ui/input';

interface TemplateField {
  name: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  config?: {
    dataSource?: string;
    pattern?: string;
    message?: string;
    minLength?: number;
    maxLength?: number;
    options?: Array<{ value: string; label: string }>;
  };
}

interface TemplateDefinition {
  id: string;
  slug: string;
  label: string;
  type: string;
  config: {
    visibility: string;
    requiresConfirmation?: boolean;
    action: {
      successMessage: string;
    };
  };
  fields: TemplateField[];
}

interface EngagementModalProps {
  template: TemplateDefinition;
  context: {
    domainId: string;
    entityType: string;
    entityId: string;
  };
  onSubmit: (inputs: Record<string, any>) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  prefillData?: Record<string, any>;
}

export function EngagementModal({
  template,
  context,
  onSubmit,
  onClose,
  isLoading,
  prefillData = {},
}: EngagementModalProps) {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize inputs with prefilled data
  useEffect(() => {
    const initialInputs: Record<string, any> = {};
    
    template.fields.forEach(field => {
      // Try to prefill from dataSource
      if (field.config?.dataSource && prefillData) {
        const path = field.config.dataSource.split('.');
        let value = prefillData;
        for (const key of path) {
          value = value?.[key];
        }
        if (value !== undefined) {
          initialInputs[field.name] = value;
        }
      }
    });

    setInputs(initialInputs);
  }, [template, prefillData]);

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    template.fields.forEach(field => {
      const value = inputs[field.name];

      // Check required
      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = `${field.label} is required`;
        return;
      }

      // Skip further validation if empty and not required
      if (!value) return;

      // Email validation
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = `${field.label} must be a valid email`;
        }
      }

      // Pattern validation
      if (field.config?.pattern) {
        const regex = new RegExp(field.config.pattern);
        if (!regex.test(value)) {
          newErrors[field.name] = field.config.message || `${field.label} format is invalid`;
        }
      }

      // Length validation
      if (field.config?.minLength && value.length < field.config.minLength) {
        newErrors[field.name] = `${field.label} must be at least ${field.config.minLength} characters`;
      }

      if (field.config?.maxLength && value.length > field.config.maxLength) {
        newErrors[field.name] = `${field.label} must be at most ${field.config.maxLength} characters`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInputs()) {
      return;
    }

    await onSubmit(inputs);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{template.label}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {template.fields.map(field => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={inputs[field.name]}
                error={errors[field.name]}
                onChange={(value) => handleInputChange(field.name, value)}
                disabled={isLoading}
              />
            ))}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// FIELD RENDERER
// ============================================================================

interface FieldRendererProps {
  field: TemplateField;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  disabled: boolean;
}

function FieldRenderer({ field, value, error, onChange, disabled }: FieldRendererProps) {
  const inputClasses = `
    w-full px-3 py-2 border rounded
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.type === 'textarea' && (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          className={inputClasses}
        />
      )}

      {field.type === 'select' && field.config?.options && (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClasses}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {field.config.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {field.type === 'password' && (
        <Input
          type="password"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={error ? 'border-red-500' : ''}
        />
      )}

      {!['textarea', 'select', 'password'].includes(field.type) && (
        <Input
          type={field.type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          className={error ? 'border-red-500' : ''}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default EngagementModal;
