/**
 * EngagementForm
 * Standalone form for engagement template fields — no Dialog wrapper.
 *
 * Features:
 * - Dynamically renders fields based on template definition
 * - Pre-fills values from dataSource or context
 * - Validates inputs before submission
 * - Shows loading state during execution
 *
 * Used inline by the Build workspace and wrapped by EngagementModal for
 * modal-based flows elsewhere in the app.
 */

import React, { useState, useEffect } from 'react';
import { Input } from '../../features/board-studio/v0/components/ui/input';

// =============================================================================
// Shared Types — exported so EngagementModal and consumers can reuse them
// =============================================================================

export interface TemplateField {
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

export interface EngagementTemplateDefinition {
  id: string;
  slug: string;
  label: string;
  type: string;
  targetType?: string;
  config: {
    visibility: string;
    requiresConfirmation?: boolean;
    action: {
      successMessage: string;
      errorMessages?: Record<string, string>;
    };
  };
  fields: TemplateField[];
}

export interface EngagementContext {
  domainId: string;
  entityType: string;
  entityId: string;
  keeperId?: string;
  [key: string]: string | undefined;
}

// =============================================================================
// EngagementForm
// =============================================================================

export interface EngagementFormProps {
  template: EngagementTemplateDefinition;
  context: EngagementContext;
  onSubmit: (inputs: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  prefillData?: Record<string, any>;
  /** Optional title override — defaults to template.label */
  title?: string;
  /** Optional class name applied to the outer wrapper */
  className?: string;
  /** `chronicle` uses Universal Board theme tokens */
  variant?: 'default' | 'chronicle';
}

export function EngagementForm({
  template,
  context,
  onSubmit,
  onCancel,
  isLoading,
  prefillData = {},
  title,
  className = '',
  variant = 'default',
}: EngagementFormProps) {
  const isChronicle = variant === 'chronicle'
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize inputs with prefilled data and context values
  useEffect(() => {
    const initialInputs: Record<string, any> = {};

    template.fields.forEach(field => {
      // Try to prefill from dataSource
      if (field.config?.dataSource && prefillData) {
        const path = field.config.dataSource.split('.');
        let value: any = prefillData;
        for (const key of path) {
          value = value?.[key];
        }
        if (value !== undefined) {
          initialInputs[field.name] = value;
        }
      }

      // Fall back: prefill from context if the field name matches a context key
      // (e.g. keeperId, domainId) and no value was set from dataSource
      if (initialInputs[field.name] === undefined && context[field.name] !== undefined) {
        initialInputs[field.name] = context[field.name];
      }
    });

    setInputs(initialInputs);
  }, [template, prefillData, context]);

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

  const hiddenContextFields = new Set(["keeperId", "domainId", "journeyId"])
  const visibleFields = isChronicle
    ? template.fields.filter(
        (field) =>
          !(
            hiddenContextFields.has(field.name) &&
            context[field.name] !== undefined &&
            context[field.name] !== ""
          ),
      )
    : template.fields

  return (
    <form onSubmit={handleSubmit} className={className}>
      {!isChronicle && (
        title !== undefined ? (
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
        ) : (
          <h3 className="text-lg font-semibold mb-4">{template.label}</h3>
        )
      )}

      <div className="space-y-4">
        {visibleFields.map(field => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={inputs[field.name]}
            error={errors[field.name]}
            onChange={(value) => handleInputChange(field.name, value)}
            disabled={isLoading}
            variant={variant}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className={
            isChronicle
              ? "rounded-full border px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              : "px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          }
          style={
            isChronicle
              ? {
                  borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                  color: "hsl(var(--theme-ink-primary))",
                }
              : undefined
          }
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={
            isChronicle
              ? "rounded-full border px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              : "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          }
          style={
            isChronicle
              ? {
                  borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                  color: "hsl(var(--theme-ink-primary))",
                }
              : undefined
          }
        >
          {isLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// FIELD RENDERER
// =============================================================================

interface FieldRendererProps {
  field: TemplateField;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  disabled: boolean;
  variant?: 'default' | 'chronicle';
}

function FieldRenderer({ field, value, error, onChange, disabled, variant = 'default' }: FieldRendererProps) {
  const isChronicle = variant === 'chronicle'
  const inputClasses = isChronicle
    ? `w-full px-3 py-2 rounded border bg-transparent text-[14px] focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-400' : ''}`
    : `
    w-full px-3 py-2 border rounded
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  const inputStyle = isChronicle
    ? {
        borderColor: error
          ? 'hsl(var(--theme-status-error, 0 72% 51%))'
          : 'hsl(var(--theme-border-soft) / 0.35)',
        color: 'hsl(var(--theme-ink-primary))',
      }
    : undefined

  return (
    <div>
      <label
        className={`block text-sm font-medium mb-1 ${isChronicle ? '' : 'text-gray-700'}`}
        style={isChronicle ? { color: 'hsl(var(--theme-ink-secondary))' } : undefined}
      >
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

export default EngagementForm;
