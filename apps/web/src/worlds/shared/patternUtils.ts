/**
 * Pattern Utilities - Shared Pattern Logic
 * =========================================
 * 
 * Shared utilities for pattern-based frame rendering.
 * Used by both NarrativeFrameRenderer (Presentation) and StructuralFrameRenderer (Workshop).
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Frame {
  id: string;
  name: string;
  pattern: string;
  visibility: 'public' | 'admin';
  props: Array<{
    id: string;
    type: string;
    config: any;
    value?: any;
    orderIndex: number;
  }>;
}

export interface PatternStyleConfig {
  className: string;
  containerClass: string;
  spacing: 'tight' | 'normal' | 'generous';
  shadows: 'soft' | 'sharp';
  borders: 'rounded' | 'square';
}

// =============================================================================
// PATTERN STYLE CONFIGURATIONS
// =============================================================================

/**
 * Get pattern-specific styling configuration
 */
export function getPatternStyles(pattern: string, mode: 'presentation' | 'workshop'): PatternStyleConfig {
  const baseStyles = {
    presentation: {
      spacing: 'generous' as const,
      shadows: 'soft' as const,
      borders: 'rounded' as const,
    },
    workshop: {
      spacing: 'normal' as const,
      shadows: 'sharp' as const,
      borders: 'rounded' as const,
    },
  };

  const modeBase = baseStyles[mode];

  // Pattern-specific overrides
  const patternOverrides: Record<string, Partial<PatternStyleConfig>> = {
    focus: {
      className: mode === 'presentation' 
        ? 'bg-white shadow-xl rounded-2xl p-10' 
        : 'bg-white shadow-lg rounded-lg p-8',
      containerClass: 'max-w-4xl mx-auto',
    },
    canvas: {
      className: mode === 'presentation'
        ? 'bg-white border-2 border-green-100 rounded-xl p-8'
        : 'bg-white border border-gray-200 rounded-lg p-6',
      containerClass: 'w-full',
    },
    gallery: {
      className: mode === 'presentation'
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8'
        : 'bg-gray-50 rounded-lg p-6',
      containerClass: 'w-full',
    },
    form: {
      className: mode === 'presentation'
        ? 'bg-white border-2 border-green-200 rounded-xl p-8'
        : 'bg-white border-2 border-gray-300 rounded-lg p-6',
      containerClass: 'max-w-2xl mx-auto',
    },
    dialogic: {
      className: mode === 'presentation'
        ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-8'
        : 'bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6',
      containerClass: 'max-w-3xl mx-auto',
    },
    wizard: {
      className: mode === 'presentation'
        ? 'bg-white shadow-lg rounded-xl p-8'
        : 'bg-white shadow-md rounded-lg p-6',
      containerClass: 'max-w-2xl mx-auto',
    },
  };

  const override = patternOverrides[pattern] || patternOverrides.canvas;

  return {
    className: override.className || '',
    containerClass: override.containerClass || 'w-full',
    spacing: modeBase.spacing,
    shadows: modeBase.shadows,
    borders: modeBase.borders,
  };
}

/**
 * Sort props by orderIndex
 */
export function sortPropsByOrder(props: Frame['props']): Frame['props'] {
  return [...props].sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Filter props by visibility (for Presentation mode)
 */
export function filterVisibleProps(
  props: Frame['props'],
  isPresentation: boolean
): Frame['props'] {
  if (!isPresentation) {
    return props; // Workshop shows all props
  }
  
  // In Presentation mode, filter out admin-only props
  // This is a placeholder - actual filtering would depend on prop metadata
  return props.filter(prop => {
    // If prop has visibility metadata, respect it
    if (prop.config?.visibility === 'admin') {
      return false;
    }
    return true;
  });
}

/**
 * Extract pathway configuration from frame props
 */
export function extractPathwayConfig(frame: Frame) {
  const pathwayConfig = frame.props.find(p => p.type === 'pathway-config')?.config || {};
  const pathProps = frame.props.filter(p => p.type === 'pathway-item' || p.type === 'link');
  
  const paths = pathProps
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(prop => ({
      label: prop.config.label || prop.config.text || 'Link',
      href: prop.config.href || prop.config.url || '#',
      description: prop.config.description || prop.config.label,
      variant: prop.config.variant || 'system',
      analyticsId: prop.config.analyticsId,
    }));

  return { pathwayConfig, paths };
}

/**
 * Check if frame is a pathway frame
 */
export function isPathwayFrame(frame: Frame): boolean {
  return frame.pattern === 'pathway' || frame.name.toLowerCase().includes('pathway');
}

/**
 * Get frame display name (with fallback)
 */
export function getFrameDisplayName(frame: Frame): string {
  return frame.name || 'Untitled Frame';
}

