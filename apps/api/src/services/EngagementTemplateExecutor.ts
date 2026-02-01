/**
 * Engagement Template Executor
 * 
 * Runtime engine that executes engagement templates:
 * - Loads template from database
 * - Validates inputs against template fields
 * - Checks permissions
 * - Calls target API endpoint
 * - Handles success/error responses
 * - Returns standardized result
 */

import { PrismaClient } from '@keeper/database';
import type { Request } from 'express';

const prisma = new PrismaClient();

export interface ExecutionContext {
  userId: string;
  domainId?: string;
  entityType: 'domain' | 'keeper' | 'journey' | 'path' | 'moment' | 'agent' | 'board';
  entityId: string;
}

export interface ExecutionInputs {
  [fieldName: string]: any;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  errorCode?: string;
}

export interface TemplateDefinition {
  id: string;
  slug: string;
  label: string;
  type: string;
  targetType: string;
  config: {
    visibility: 'public' | 'admin' | 'member';
    action: {
      endpoint: string;
      method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
      successMessage: string;
      errorMessages?: { [code: string]: string };
      body?: any;
      refreshAfter?: boolean;
    };
    requiresConfirmation?: boolean;
  };
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    config?: any;
  }>;
}

export class EngagementTemplateExecutor {
  /**
   * Execute an engagement template
   */
  async execute(
    templateSlug: string,
    context: ExecutionContext,
    inputs: ExecutionInputs,
    req: Request
  ): Promise<ExecutionResult> {
    try {
      // 1. Load template from database
      const template = await this.loadTemplate(templateSlug);
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found',
          error: 'TEMPLATE_NOT_FOUND',
          errorCode: 'TEMPLATE_NOT_FOUND'
        };
      }

      // 2. Check permissions
      const hasPermission = await this.checkPermissions(template, context);
      
      if (!hasPermission) {
        return {
          success: false,
          message: 'You do not have permission to perform this action',
          error: 'PERMISSION_DENIED',
          errorCode: 'PERMISSION_DENIED'
        };
      }

      // 3. Validate inputs
      const validation = this.validateInputs(template.fields, inputs);
      
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid input',
          error: validation.errors.join(', '),
          errorCode: 'VALIDATION_ERROR'
        };
      }

      // 4. Build API request
      const apiRequest = this.buildRequest(template, context, inputs);

      // 5. Execute API call
      const response = await this.callEndpoint(apiRequest, req);

      // 6. Handle response
      return this.handleResponse(response, template);
    } catch (error) {
      console.error('Engagement template execution error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR'
      };
    }
  }

  /**
   * Load template from database
   */
  private async loadTemplate(slug: string): Promise<TemplateDefinition | null> {
    const template = await prisma.engagement_templates.findUnique({
      where: { slug },
      include: {
        engagement_fields: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!template) {
      return null;
    }

    // Parse config from JSON
    const config = (template.config as any) || {};

    return {
      id: template.id,
      slug: template.slug,
      label: template.label,
      type: template.type,
      targetType: template.targetType,
      config: {
        visibility: config.visibility || 'public',
        action: config.action || {},
        requiresConfirmation: config.requiresConfirmation || false
      },
      fields: template.engagement_fields.map(f => ({
        name: f.name,
        type: f.type,
        label: f.label,
        required: (f.config as any)?.required || false,
        config: f.config as any
      }))
    };
  }

  /**
   * Check if user has permission to execute this template
   */
  private async checkPermissions(
    template: TemplateDefinition,
    context: ExecutionContext
  ): Promise<boolean> {
    const { visibility } = template.config;

    // Public templates - always allowed
    if (visibility === 'public') {
      return true;
    }

    // Admin/Member templates - check domain permissions when domain context exists
    if (context.domainId) {
      const permission = await prisma.domainPermission.findUnique({
        where: {
          domainId_userId: {
            domainId: context.domainId,
            userId: context.userId
          }
        }
      });

      // Check if owner
      const domain = await prisma.domain.findUnique({
        where: { id: context.domainId },
        select: { ownerId: true }
      });

      const isOwner = domain?.ownerId === context.userId;
      const isAdmin = permission?.role === 'admin' || permission?.role === 'owner' || isOwner;

      if (visibility === 'admin') {
        return isAdmin;
      }

      if (visibility === 'member') {
        return !!permission || isOwner;
      }
    }

    // Default: deny
    return false;
  }

  /**
   * Validate inputs against template fields
   */
  private validateInputs(
    fields: TemplateDefinition['fields'],
    inputs: ExecutionInputs
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of fields) {
      const value = inputs[field.name];

      // Check required
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }

      // Skip validation if empty and not required
      if (!value) continue;

      // Type-specific validation
      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${field.label} must be a valid email`);
        }
      }

      // Pattern validation
      if (field.config?.pattern && value) {
        const regex = new RegExp(field.config.pattern);
        if (!regex.test(value)) {
          errors.push(field.config.message || `${field.label} format is invalid`);
        }
      }

      // Length validation
      if (field.config?.minLength && value.length < field.config.minLength) {
        errors.push(`${field.label} must be at least ${field.config.minLength} characters`);
      }

      if (field.config?.maxLength && value.length > field.config.maxLength) {
        errors.push(`${field.label} must be at most ${field.config.maxLength} characters`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Build API request from template and inputs
   */
  private buildRequest(
    template: TemplateDefinition,
    context: ExecutionContext,
    inputs: ExecutionInputs
  ): {
    url: string;
    method: string;
    body?: any;
  } {
    const { endpoint, method, body: bodyTemplate } = template.config.action;

    // Replace placeholders in endpoint
    let url = endpoint;
    url = url.replace(':domainId', context.domainId || '');
    url = url.replace(':entityId', context.entityId);
    url = url.replace(':userId', context.userId);

    // Replace placeholders in inputs
    for (const [key, value] of Object.entries(inputs)) {
      url = url.replace(`:${key}`, String(value));
    }

    // Build request body
    let body: any = undefined;

    if (method !== 'GET' && method !== 'DELETE') {
      if (bodyTemplate) {
        // Use template body with placeholder replacement
        body = JSON.parse(JSON.stringify(bodyTemplate));
        for (const [key, value] of Object.entries(inputs)) {
          body = this.replacePlaceholder(body, `:${key}`, value);
        }
      } else {
        // Use inputs directly as body
        body = inputs;
      }
    }

    return { url, method, body };
  }

  /**
   * Replace placeholders in object recursively
   */
  private replacePlaceholder(obj: any, placeholder: string, value: any): any {
    if (typeof obj === 'string') {
      return obj.replace(placeholder, String(value));
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replacePlaceholder(item, placeholder, value));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = this.replacePlaceholder(v, placeholder, value);
      }
      return result;
    }
    
    return obj;
  }

  /**
   * Call the target API endpoint
   */
  private async callEndpoint(
    request: { url: string; method: string; body?: any },
    req: Request
  ): Promise<{ ok: boolean; status: number; data: any }> {
    const baseUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';
    const fullUrl = `${baseUrl}${request.url}`;

    console.log('Engagement Template: Calling endpoint', {
      url: fullUrl,
      method: request.method,
      hasBody: !!request.body
    });

    // Get auth token from request
    const token = req.headers.authorization;

    const response = await fetch(fullUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token || '',
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  }

  /**
   * Handle API response
   */
  private handleResponse(
    response: { ok: boolean; status: number; data: any },
    template: TemplateDefinition
  ): ExecutionResult {
    if (response.ok) {
      return {
        success: true,
        message: template.config.action.successMessage,
        data: response.data
      };
    }

    // Handle errors
    const errorCode = response.data?.error || response.data?.code || `HTTP_${response.status}`;
    const errorMessages = template.config.action.errorMessages || {};
    const message = errorMessages[errorCode] || response.data?.message || 'Action failed';

    return {
      success: false,
      message,
      error: response.data?.error,
      errorCode
    };
  }

  /**
   * Get template by slug (public method for UI)
   */
  async getTemplate(slug: string): Promise<TemplateDefinition | null> {
    return this.loadTemplate(slug);
  }

  /**
   * Get templates for a KeeperType
   */
  async getTemplatesForType(keeperTypeName: string): Promise<TemplateDefinition[]> {
    const keeperType = await prisma.keeperType.findFirst({
      where: { name: keeperTypeName }
    });

    if (!keeperType) {
      return [];
    }

    const links = await prisma.keeper_type_engagement_templates.findMany({
      where: { keeper_type_id: keeperType.id },
      include: {
        engagement_templates: {
          include: {
            engagement_fields: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    return links.map(link => {
      const template = link.engagement_templates;
      const config = (template.config as any) || {};
      
      return {
        id: template.id,
        slug: template.slug,
        label: template.label,
        type: template.type,
        targetType: template.targetType,
        config: {
          visibility: config.visibility || 'public',
          action: config.action || {},
          requiresConfirmation: config.requiresConfirmation || false
        },
        fields: template.engagement_fields.map(f => ({
          name: f.name,
          type: f.type,
          label: f.label,
          required: (f.config as any)?.required || false,
          config: f.config as any
        }))
      };
    });
  }
}

// Export singleton instance
export const engagementExecutor = new EngagementTemplateExecutor();

