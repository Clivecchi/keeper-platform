/**
 * Action Button Renderer
 * ======================
 * Renders a button that executes an engagement template
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { generateRequestId } from '@/lib/uid/requestId';
import { EngagementTemplate, SubmitOptions } from '@/lib/engagement/types';

interface ActionButtonProps {
  prop: any;
  getTemplate: () => Promise<EngagementTemplate>;
  submit: (template: EngagementTemplate, payload: Record<string, any>, opts?: SubmitOptions) => Promise<any>;
  context: { boardId?: string; frameId?: string };
}

export function ActionButton({ prop, getTemplate, submit, context }: ActionButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);

    try {
      const template = await getTemplate();
      const payload = {
        ...context,
        ...prop.config?.prefill,
      };

      const result = await submit(template, payload, {
        requestId: generateRequestId(),
      });

      // TODO: Show success toast/notification
      console.log('[ActionButton] Success:', result);
      
      // Call optional onSuccess callback
      if (prop.config?.onSuccess) {
        prop.config.onSuccess(result);
      }
    } catch (err: any) {
      setError(err.message || 'Action failed');
      console.error('[ActionButton] Error:', err);
      
      // Call optional onError callback
      if (prop.config?.onError) {
        prop.config.onError(err);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={onClick}
        disabled={pending}
        variant={prop.config?.variant || 'default'}
        size={prop.config?.size || 'default'}
      >
        {pending ? 'Loading...' : (prop.config?.label || 'Run Action')}
      </Button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

