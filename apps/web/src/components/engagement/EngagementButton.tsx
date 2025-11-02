/**
 * EngagementButton
 * Triggers engagement template execution
 * 
 * Features:
 * - Fetches template definition
 * - Opens modal if template has fields
 * - Executes immediately if no fields (with optional confirmation)
 * - Handles success/error states
 * - Refreshes board data after successful execution
 */

import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { EngagementModal } from './EngagementModal';

interface EngagementButtonProps {
  templateSlug: string;
  context: {
    domainId: string;
    entityType: string;
    entityId: string;
  };
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
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
      errorMessages?: Record<string, string>;
    };
  };
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    config?: any;
  }>;
}

export function EngagementButton({
  templateSlug,
  context,
  label,
  variant = 'primary',
  className = '',
  onSuccess,
  onError,
}: EngagementButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Fetch template definition
      const response = await apiFetch(`/api/engagement/templates/${templateSlug}`);
      
      if (!response.success || !response.data) {
        throw new Error('Template not found');
      }

      const templateData: TemplateDefinition = response.data;
      setTemplate(templateData);

      // If template has fields, show modal
      if (templateData.fields && templateData.fields.length > 0) {
        setShowModal(true);
        setIsLoading(false);
        return;
      }

      // If template requires confirmation and has no fields, confirm first
      if (templateData.config.requiresConfirmation) {
        const confirmed = window.confirm(
          `Are you sure you want to ${templateData.label.toLowerCase()}?`
        );
        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }

      // Execute immediately for action-only templates (no fields)
      await executeTemplate({});
    } catch (error) {
      console.error('Error loading template:', error);
      if (onError) {
        onError(error);
      }
      alert('Failed to load template. Please try again.');
      setIsLoading(false);
    }
  };

  const executeTemplate = async (inputs: Record<string, any>) => {
    setIsLoading(true);

    try {
      const response = await apiFetch('/api/engagement/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateSlug,
          context,
          inputs,
        }),
      });

      if (response.success) {
        // Success!
        if (onSuccess) {
          onSuccess(response);
        }
        
        // Show success message
        const message = response.message || template?.config.action.successMessage || 'Action completed successfully';
        alert(message); // TODO: Replace with toast notification
        
        setShowModal(false);
      } else {
        // Error from execution
        throw new Error(response.message || response.error || 'Action failed');
      }
    } catch (error) {
      console.error('Error executing template:', error);
      if (onError) {
        onError(error);
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Action failed. Please try again.';
      alert(errorMessage); // TODO: Replace with toast notification
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSubmit = async (inputs: Record<string, any>) => {
    await executeTemplate(inputs);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded font-medium transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {isLoading ? 'Loading...' : label || 'Execute'}
      </button>

      {showModal && template && (
        <EngagementModal
          template={template}
          context={context}
          onSubmit={handleModalSubmit}
          onClose={handleModalClose}
          isLoading={isLoading}
        />
      )}
    </>
  );
}

export default EngagementButton;
