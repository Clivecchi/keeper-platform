/**
 * Engagement Modal Component
 * 
 * Displays a form modal for engagement templates that require user input
 * Handles form state, validation, and submission
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../features/board-studio/v0/components/ui/dialog';
import { Button } from '../../features/board-studio/v0/components/ui/button';
import { Input } from '../../features/board-studio/v0/components/ui/input';
import { Label } from '../../features/board-studio/v0/components/ui/label';
import { Textarea } from '../../features/board-studio/v0/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../features/board-studio/v0/components/ui/select';

interface TemplateField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  config?: {
    options?: Array<{ value: string; label: string }>;
    dataSource?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    message?: string;
  };
}

interface Template {
  slug: string;
  label: string;
  fields: TemplateField[];
  config: {
    action: {
      successMessage?: string;
    };
  };
}

interface EngagementModalProps {
  template: Template;
  onSubmit: (inputs: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error?: string | null;
  initialValues?: any;
}

export function EngagementModal({
  template,
  onSubmit,
  onCancel,
  isLoading,
  error,
  initialValues = {}
}: EngagementModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data
  useEffect(() => {
    const initial: any = {};
    template.fields.forEach(field => {
      initial[field.name] = initialValues[field.name] || '';
    });
    setFormData(initial);
  }, [template, initialValues]);

  /**
   * Handle field change
   */
  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  /**
   * Validate form before submission
   */
  const validate = (): boolean => {
    const errors: { [key: string]: string } = {};

    template.fields.forEach(field => {
      const value = formData[field.name];

      // Check required
      if (field.required && !value) {
        errors[field.name] = `${field.label} is required`;
        return;
      }

      // Skip if empty and not required
      if (!value) return;

      // Email validation
      if (field.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field.name] = 'Invalid email format';
        }
      }

      // Pattern validation
      if (field.config?.pattern) {
        const regex = new RegExp(field.config.pattern);
        if (!regex.test(value)) {
          errors[field.name] = field.config.message || 'Invalid format';
        }
      }

      // Length validation
      if (field.config?.minLength && value.length < field.config.minLength) {
        errors[field.name] = `Must be at least ${field.config.minLength} characters`;
      }

      if (field.config?.maxLength && value.length > field.config.maxLength) {
        errors[field.name] = `Must be at most ${field.config.maxLength} characters`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit(formData);
  };

  /**
   * Render form field based on type
   */
  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';
    const hasError = !!validationErrors[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={hasError ? 'border-red-500' : ''}
              disabled={isLoading}
              rows={4}
            />
            {hasError && (
              <p className="text-xs text-red-600">{validationErrors[field.name]}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleChange(field.name, val)}
              disabled={isLoading}
            >
              <SelectTrigger className={hasError ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.config?.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-xs text-red-600">{validationErrors[field.name]}</p>
            )}
          </div>
        );

      case 'password':
      case 'email':
      case 'text':
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={hasError ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {hasError && (
              <p className="text-xs text-red-600">{validationErrors[field.name]}</p>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Loading...' : (children || label || 'Execute')}
      </Button>

      {showModal && template && (
        <Dialog open={showModal} onOpenChange={(open) => !isLoading && setShowModal(open)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{template.label}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {template.fields.map((field: TemplateField) => renderField(field))}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

