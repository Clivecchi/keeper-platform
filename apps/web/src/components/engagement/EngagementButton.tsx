/**
 * Engagement Button Component
 * 
 * Triggers engagement templates with optional form inputs
 * Handles loading states, success/error messages, and callbacks
 */

import React, { useState } from 'react';
import { Button } from '../../features/board-studio/v0/components/ui/button';
import { apiFetch } from '../../lib/api';
import { EngagementModal } from './EngagementModal';

interface EngagementButtonProps {
  templateSlug: string;
  context: {
    entityType: 'domain' | 'keeper' | 'journey' | 'agent' | 'board';
    entityId: string;
    domainId?: string;
  };
  label?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  children?: React.ReactNode;
}

export function EngagementButton({
  templateSlug,
  context,
  label,
  variant = 'default',
  size = 'default',
  className = '',
  disabled = false,
  onSuccess,
  onError,
  children
}: EngagementButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle button click - load template and show modal if needed
   */
  const handleClick = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load template definition
      const response = await apiFetch(`/api/engagement/templates/${templateSlug}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load template');
      }

      const templateData = response.data;
      setTemplate(templateData);

      // If template has fields, show modal
      if (templateData.fields && templateData.fields.length > 0) {
        setShowModal(true);
        setIsLoading(false);
      } else {
        // No inputs needed, execute immediately
        await executeTemplate({});
      }
    } catch (err) {
      console.error('Error loading template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
      setIsLoading(false);
      
      if (onError) {
        onError(err);
      }
    }
  };

  /**
   * Execute the template with provided inputs
   */
  const executeTemplate = async (inputs: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiFetch('/api/engagement/execute', {
        method: 'POST',
        body: JSON.stringify({
          templateSlug,
          context,
          inputs
        })
      });

      if (response.success) {
        // Success
        if (onSuccess) {
          onSuccess(response);
        }
        
        setShowModal(false);
        setIsLoading(false);
      } else {
        // Error from execution
        throw new Error(response.message || response.error || 'Execution failed');
      }
    } catch (err) {
      console.error('Error executing template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setError(errorMessage);
      setIsLoading(false);
      
      if (onError) {
        onError(err);
      }
    }
  };

  /**
   * Handle modal submit
   */
  const handleModalSubmit = async (inputs: any) => {
    await executeTemplate(inputs);
  };

  /**
   * Handle modal cancel
   */
  const handleModalCancel = () => {
    setShowModal(false);
    setIsLoading(false);
    setError(null);
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

      {error && (
        <div className="text-xs text-red-600 mt-1">
          {error}
        </div>
      )}

      {showModal && template && (
        <EngagementModal
          template={template}
          onSubmit={handleModalSubmit}
          onCancel={handleModalCancel}
          isLoading={isLoading}
          error={error}
        />
      )}
    </>
  );
}

