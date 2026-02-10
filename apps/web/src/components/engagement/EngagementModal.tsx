/**
 * EngagementModal
 * Dialog wrapper around EngagementForm for modal-based engagement flows.
 *
 * This is a thin shell — all form logic lives in EngagementForm.
 * Used by EngagementButton (when onActivate is NOT provided) and any
 * other consumer that needs the form inside a centered overlay dialog.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../features/board-studio/v0/components/ui/dialog';
import { EngagementForm } from './EngagementForm';
import type { EngagementTemplateDefinition, EngagementContext } from './EngagementForm';

interface EngagementModalProps {
  template: EngagementTemplateDefinition;
  context: EngagementContext;
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
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.label}</DialogTitle>
        </DialogHeader>

        <EngagementForm
          template={template}
          context={context}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          prefillData={prefillData}
          /* Hide the built-in title since DialogTitle handles it */
          title=""
        />
      </DialogContent>
    </Dialog>
  );
}

export default EngagementModal;
