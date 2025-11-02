/**
 * Form Prop Component
 * 
 * Renders a form that submits via an engagement template
 * Used in Design Board frames for structured data collection
 */

import React from 'react';
import { EngagementButton } from '../engagement/EngagementButton';

export interface FormPropConfig {
  type: 'FormProp';
  fields: string[] | Array<{ name: string; label?: string; type?: string }>;
  submitEngagement: string; // Engagement template slug
  submitLabel?: string;
}

interface FormPropProps {
  config: FormPropConfig;
  boardData: any; // Domain board data
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export function FormProp({
  config,
  boardData,
  onSuccess,
  onError
}: FormPropProps) {
  // Determine context from board data
  const context = {
    entityType: 'domain' as const,
    entityId: boardData?.domain?.id || '',
    domainId: boardData?.domain?.id
  };

  // Get initial values from board data
  const initialValues: any = {};
  const fieldNames = config.fields.map(f => 
    typeof f === 'string' ? f : f.name
  );
  
  fieldNames.forEach(fieldName => {
    if (boardData?.domain?.[fieldName] !== undefined) {
      initialValues[fieldName] = boardData.domain[fieldName];
    }
  });

  return (
    <div className="space-y-4">
      <EngagementButton
        templateSlug={config.submitEngagement}
        context={context}
        label={config.submitLabel || 'Submit'}
        variant="primary"
        onSuccess={(result) => {
          console.log('Form submission success:', result);
          if (onSuccess) {
            onSuccess();
          }
        }}
        onError={(error) => {
          console.error('Form submission error:', error);
          if (onError) {
            onError(error);
          }
        }}
      />
    </div>
  );
}

