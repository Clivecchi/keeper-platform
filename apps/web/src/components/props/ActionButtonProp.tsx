/**
 * Action Button Prop Component
 * 
 * Renders an action button that triggers an engagement template
 * Used in Design Board frames to execute domain actions
 */

import React from 'react';
import { EngagementButton } from '../engagement/EngagementButton';

export interface ActionButtonPropConfig {
  type: 'ActionButtonProp';
  label: string;
  engagementTemplate: string;
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost';
  condition?: string; // e.g., '!domain.customDomainVerified'
  icon?: string;
}

interface ActionButtonPropProps {
  config: ActionButtonPropConfig;
  boardData: any; // Domain board data from /api/domains/:id/board-data
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function ActionButtonProp({
  config,
  boardData,
  onSuccess,
  onError
}: ActionButtonPropProps) {
  // Evaluate condition if present
  if (config.condition) {
    const conditionMet = evaluateCondition(config.condition, boardData);
    if (!conditionMet) {
      return null; // Don't render if condition not met
    }
  }

  // Determine context from board data
  const context = {
    entityType: 'domain' as const,
    entityId: boardData?.domain?.id || '',
    domainId: boardData?.domain?.id
  };

  return (
    <EngagementButton
      templateSlug={config.engagementTemplate}
      context={context}
      label={config.label}
      variant={config.variant || 'default'}
      onSuccess={(result) => {
        console.log('Engagement success:', result);
        if (onSuccess) {
          onSuccess();
        }
      }}
      onError={(error) => {
        console.error('Engagement error:', error);
        if (onError) {
          onError(error);
        }
      }}
    />
  );
}

/**
 * Evaluate simple conditions like '!domain.customDomainVerified'
 */
function evaluateCondition(condition: string, data: any): boolean {
  try {
    // Handle negation
    if (condition.startsWith('!')) {
      return !evaluateCondition(condition.substring(1), data);
    }

    // Handle property path (e.g., 'domain.customDomainVerified')
    const parts = condition.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return false;
      }
    }

    return !!value;
  } catch {
    return false;
  }
}

