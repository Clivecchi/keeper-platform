/**
 * Action Prop Renderer
 * ====================
 * Top-level renderer for action props that bind to Engagement Templates
 */

import { getTemplateByKey } from '@/lib/engagement/templates.client';
import { submitTemplate } from '@/lib/engagement/submit';
import { ActionButton } from './renderers/ActionButton';
import { ActionToggle } from './renderers/ActionToggle';
import { ActionForm } from './renderers/ActionForm';
import { ActionUpload } from './renderers/ActionUpload';
import { useViewerContext, passesVisibility } from '@/hooks/useViewerContext';

interface ActionPropRendererProps {
  prop: any;
  boardId?: string;
  frameId?: string;
}

export default function ActionPropRenderer({ prop, boardId, frameId }: ActionPropRendererProps) {
  const { roles, viewerMode } = useViewerContext();

  // Check visibility rules
  if (!passesVisibility(prop?.visibility, roles, viewerMode)) {
    return null;
  }

  const templateKey = prop?.config?.templateKey;
  if (!templateKey) {
    console.warn('[ActionPropRenderer] No templateKey found in prop config', prop);
    return null;
  }

  const context = { boardId, frameId };

  // Route to appropriate renderer based on prop type
  switch (prop.type) {
    case 'action.button':
      return (
        <ActionButton
          prop={prop}
          getTemplate={() => getTemplateByKey(templateKey)}
          submit={submitTemplate}
          context={context}
        />
      );

    case 'action.toggle':
      return (
        <ActionToggle
          prop={prop}
          getTemplate={() => getTemplateByKey(templateKey)}
          submit={submitTemplate}
          context={context}
        />
      );

    case 'action.form':
      return (
        <ActionForm
          prop={prop}
          getTemplate={() => getTemplateByKey(templateKey)}
          submit={submitTemplate}
          context={context}
        />
      );

    case 'action.upload':
      return (
        <ActionUpload
          prop={prop}
          getTemplate={() => getTemplateByKey(templateKey)}
          submit={submitTemplate}
          context={context}
        />
      );

    default:
      console.warn('[ActionPropRenderer] Unknown action prop type:', prop.type);
      return null;
  }
}

