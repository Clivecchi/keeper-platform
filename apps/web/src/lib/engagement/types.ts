/**
 * Engagement Template Types
 * =========================
 * Shared types for Props ⇄ Engagement Template Adapter
 */

export type ViewerMode = 'public' | 'member' | 'editor';

export type VisibilityRule = {
  roles?: string[];         // e.g., ['admin']
  viewerModes?: ViewerMode[]; // e.g., ['editor']
};

export type ActionPropBase = {
  id: string;
  type: 'action.button' | 'action.toggle' | 'action.form' | 'action.upload';
  visibility?: VisibilityRule;
  config: Record<string, any>; // renderer-specific config
};

export type TemplateField =
  | {
      name: string;
      type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'file' | 'password';
      label?: string;
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      required?: boolean;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      pattern?: string;
    }
  | {
      name: string;
      type: 'boolean' | 'checkbox';
      label?: string;
      defaultValue?: boolean;
    };

export type EngagementTemplate = {
  key: string;                     // e.g., 'domain.board.publish'
  label: string;
  scope: 'public' | 'admin';
  endpoint: string;                // e.g., '/api/boards/:boardId/publish'
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  fields?: TemplateField[];        // for forms/uploads/toggles
  requiredRole?: string;           // e.g., 'admin'
  meta?: Record<string, any>;      // extra hints if needed
};

export type SubmitOptions = {
  dryRun?: boolean;
  requestId?: string;
};

export type SubmitResult = {
  ok: boolean;
  dryRun?: boolean;
  diff?: Record<string, any>;
  [key: string]: any;
};

