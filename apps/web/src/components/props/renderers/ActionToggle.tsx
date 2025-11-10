/**
 * Action Toggle Renderer
 * ======================
 * Renders a toggle/switch that executes an engagement template
 */

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { generateRequestId } from '@/lib/uid/requestId';
import { EngagementTemplate, SubmitOptions } from '@/lib/engagement/types';

interface ActionToggleProps {
  prop: any;
  getTemplate: () => Promise<EngagementTemplate>;
  submit: (template: EngagementTemplate, payload: Record<string, any>, opts?: SubmitOptions) => Promise<any>;
  context: { boardId?: string; frameId?: string };
}

export function ActionToggle({ prop, getTemplate, submit, context }: ActionToggleProps) {
  const [checked, setChecked] = useState(!!prop.config?.initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valueField = prop.config?.valueField || 'value';
  const label = prop.config?.label || 'Toggle';

  useEffect(() => {
    setChecked(!!prop.config?.initial);
  }, [prop.config?.initial]);

  async function onChange(next: boolean) {
    setPending(true);
    setError(null);
    
    // Optimistically update UI
    setChecked(next);

    try {
      const template = await getTemplate();
      const payload = {
        [valueField]: next,
        ...context,
        ...prop.config?.prefill,
      };

      const result = await submit(template, payload, {
        requestId: generateRequestId(),
      });

      console.log('[ActionToggle] Success:', result);
      
      // Call optional onSuccess callback
      if (prop.config?.onSuccess) {
        prop.config.onSuccess(result);
      }
    } catch (err: any) {
      // Revert on error
      setChecked(!next);
      setError(err.message || 'Toggle failed');
      console.error('[ActionToggle] Error:', err);
      
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
      <div className="flex items-center gap-2">
        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={pending}
          id={`toggle-${prop.id}`}
        />
        <Label htmlFor={`toggle-${prop.id}`} className="cursor-pointer">
          {label}
        </Label>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

