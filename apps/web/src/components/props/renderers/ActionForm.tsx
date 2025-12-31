/**
 * Action Form Renderer
 * ====================
 * Renders a dynamic form based on engagement template fields
 */

import { useState, useEffect } from 'react';
import { Button } from '@/features/board-studio/v0/components/ui/button';
import { Input } from '@/features/board-studio/v0/components/ui/input';
import { Label } from '@/features/board-studio/v0/components/ui/label';
import { Textarea } from '@/features/board-studio/v0/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/board-studio/v0/components/ui/select';
import { generateRequestId } from '@/lib/uid/requestId';
import { EngagementTemplate, SubmitOptions, TemplateField } from '@/lib/engagement/types';

interface ActionFormProps {
  prop: any;
  getTemplate: () => Promise<EngagementTemplate>;
  submit: (template: EngagementTemplate, payload: Record<string, any>, opts?: SubmitOptions) => Promise<any>;
  context: { boardId?: string; frameId?: string };
}

export function ActionForm({ prop, getTemplate, submit, context }: ActionFormProps) {
  const [template, setTemplate] = useState<EngagementTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate()
      .then((tpl) => {
        setTemplate(tpl);
        // Initialize form data with defaults
        const initial: Record<string, any> = { ...prop.config?.prefill };
        tpl.fields?.forEach((field) => {
          if ('defaultValue' in field && field.defaultValue !== undefined) {
            initial[field.name] = field.defaultValue;
          }
        });
        setFormData(initial);
      })
      .catch((err) => {
        console.error('[ActionForm] Failed to load template:', err);
        setError('Failed to load form');
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(name: string, value: any) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;

    setPending(true);
    setError(null);

    try {
      const payload = {
        ...context,
        ...formData,
      };

      const result = await submit(template, payload, {
        requestId: generateRequestId(),
      });

      console.log('[ActionForm] Success:', result);
      
      // Call optional onSuccess callback
      if (prop.config?.onSuccess) {
        prop.config.onSuccess(result);
      }

      // Reset form if configured
      if (prop.config?.resetOnSuccess) {
        const initial: Record<string, any> = {};
        template.fields?.forEach((field) => {
          if ('defaultValue' in field) {
            initial[field.name] = field.defaultValue;
          }
        });
        setFormData(initial);
      }
    } catch (err: any) {
      setError(err.message || 'Form submission failed');
      console.error('[ActionForm] Error:', err);
      
      // Call optional onError callback
      if (prop.config?.onError) {
        prop.config.onError(err);
      }
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading form...</div>;
  }

  if (!template) {
    return <div className="text-sm text-red-600">Form unavailable</div>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="font-semibold">{prop.config?.label || template.label}</h3>
      
      {template.fields?.map((field) => (
        <div key={field.name} className="space-y-2">
          {renderField(field, formData[field.name], (value) => handleChange(field.name, value))}
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting...' : (prop.config?.submitLabel || 'Submit')}
        </Button>
        {prop.config?.cancelLabel && (
          <Button type="button" variant="outline" onClick={() => prop.config?.onCancel?.()}>
            {prop.config.cancelLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

function renderField(field: TemplateField, value: any, onChange: (value: any) => void) {
  const id = `field-${field.name}`;
  const label = field.label || field.name;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
      return (
        <>
          <Label htmlFor={id}>{label}{field.required && ' *'}</Label>
          <Input
            id={id}
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
          />
        </>
      );

    case 'number':
      return (
        <>
          <Label htmlFor={id}>{label}{field.required && ' *'}</Label>
          <Input
            id={id}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            required={field.required}
            min={field.min}
            max={field.max}
          />
        </>
      );

    case 'textarea':
      return (
        <>
          <Label htmlFor={id}>{label}{field.required && ' *'}</Label>
          <Textarea
            id={id}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
          />
        </>
      );

    case 'select':
      return (
        <>
          <Label htmlFor={id}>{label}{field.required && ' *'}</Label>
          <Select value={value || ''} onValueChange={onChange} required={field.required}>
            <SelectTrigger id={id}>
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      );

    case 'boolean':
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={id}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor={id} className="cursor-pointer">
            {label}
          </Label>
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unsupported field type: {field.type}
        </div>
      );
  }
}

