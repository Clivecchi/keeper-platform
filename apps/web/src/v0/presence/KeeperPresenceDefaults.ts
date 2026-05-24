/**
 * KeeperPresenceDefaults
 * ======================
 * Platform-level default field schemas for all Chronicle-renderable object types.
 *
 * Resolution order (lowest to highest precedence):
 *   1. These platform defaults
 *   2. Domain-level PresenceSchema record (from database)
 *   3. Object-level presenceSchema field (set directly on the record)
 *
 * Field roles:
 *   primary   — dominant; always large and prominent
 *   secondary — readable body text
 *   ambient   — smaller, contextual, muted
 *   quiet     — smallest; metadata-level
 *
 * Density levels (ascending detail):
 *   always      — rendered at every density
 *   standard    — rendered at standard and comfortable
 *   comfortable — rendered only at comfortable
 */

export type FieldRole = 'primary' | 'secondary' | 'ambient' | 'quiet'
export type DensityLevel = 'always' | 'standard' | 'comfortable'

export interface FieldDefinition {
  /** Visual weight and position in the rendered surface */
  role: FieldRole
  /** If true, rendered regardless of density setting */
  always?: boolean
  /** Minimum density required to show this field (overridden by always) */
  minDensity?: DensityLevel
  /** Whether this field is editable inline — false = read-only styled text */
  editable?: boolean
  /** Display label override; defaults to field key formatted as title case */
  label?: string
}

export interface ObjectPresenceSchema {
  objectType: string
  fields: Record<string, FieldDefinition>
}

export const PRESENCE_SCHEMA_DEFAULTS: Record<string, ObjectPresenceSchema> = {
  journey: {
    objectType: 'journey',
    fields: {
      name:                { role: 'primary',   always: true,             editable: true  },
      forward:             { role: 'secondary', minDensity: 'standard',   editable: true  },
      momentCountSummary:  { role: 'ambient',   minDensity: 'standard',   editable: false, label: 'Moments' },
      keeperName:          { role: 'ambient',   minDensity: 'comfortable', editable: false },
      createdAt:           { role: 'quiet',     always: true,             editable: false },
    },
  },

  moment: {
    objectType: 'moment',
    fields: {
      title:       { role: 'primary',   always: true,                     editable: true  },
      narrative:   { role: 'secondary', minDensity: 'standard',           editable: true  },
      journeyName: { role: 'ambient',   minDensity: 'standard',           editable: false, label: 'Journey' },
      pathName:    { role: 'ambient',   minDensity: 'comfortable',        editable: false, label: 'Path' },
      updatedAt:   { role: 'quiet',     always: true,                     editable: false },
    },
  },

  keeper: {
    objectType: 'keeper',
    fields: {
      title:       { role: 'primary',   always: true,                     editable: true  },
      purpose:     { role: 'secondary', minDensity: 'standard',           editable: true  },
      keeperType:  { role: 'ambient',   minDensity: 'comfortable',        editable: false, label: 'Type' },
      createdAt:   { role: 'quiet',     always: true,                     editable: false },
    },
  },

  agent: {
    objectType: 'agent',
    fields: {
      name:          { role: 'primary',   always: true,                   editable: true  },
      purpose:       { role: 'secondary', minDensity: 'standard',         editable: true  },
      context_scope: { role: 'secondary', minDensity: 'standard',         editable: true,  label: 'System Prompt' },
      model:         { role: 'ambient',   always: true,                   editable: true  },
      status:        { role: 'quiet',     always: true,                   editable: false },
      tools:         { role: 'secondary', minDensity: 'comfortable',      editable: true  },
    },
  },

  draft: {
    objectType: 'draft',
    fields: {
      title:     { role: 'primary',   always: true,                       editable: true  },
      status:    { role: 'quiet',     always: true,                       editable: false },
      summary:   { role: 'secondary', minDensity: 'standard',             editable: false },
      kind:      { role: 'ambient',   minDensity: 'comfortable',          editable: false },
      updatedAt: { role: 'quiet',     minDensity: 'standard',             editable: false, label: 'Updated' },
    },
  },

  dialog: {
    objectType: 'dialog',
    fields: {
      title:        { role: 'primary',   always: true,                    editable: true  },
      context:      { role: 'secondary', minDensity: 'standard',          editable: false, label: 'Scope' },
      sessionCount: { role: 'ambient',   minDensity: 'standard',          editable: false, label: 'Sessions' },
      updated_at:   { role: 'quiet',     always: true,                    editable: false, label: 'Updated' },
    },
  },

  service: {
    objectType: 'service',
    fields: {
      name:       { role: 'primary',   always: true,                      editable: false },
      status:     { role: 'quiet',     always: true,                      editable: false },
      account:    { role: 'secondary', minDensity: 'standard',            editable: false },
      lastActive: { role: 'ambient',   minDensity: 'comfortable',         editable: false },
    },
  },

  domain: {
    objectType: 'domain',
    fields: {
      name:        { role: 'primary',   always: true,                     editable: false },
      description: { role: 'secondary', minDensity: 'standard',           editable: true  },
      status:      { role: 'quiet',     always: true,                     editable: false },
      slug:        { role: 'ambient',   minDensity: 'comfortable',        editable: false },
    },
  },

  frame: {
    objectType: 'frame',
    fields: {
      name:        { role: 'primary',   always: true,                     editable: false },
      description: { role: 'secondary', minDensity: 'standard',           editable: false },
      frameKey:    { role: 'quiet',     always: true,                     editable: false, label: 'Key' },
      boardId:     { role: 'ambient',   minDensity: 'comfortable',        editable: false, label: 'Board' },
    },
  },

  boardDef: {
    objectType: 'boardDef',
    fields: {
      title:       { role: 'primary',   always: true,                   editable: false },
      boardId:     { role: 'quiet',     always: true,                   editable: false, label: 'ID' },
    },
  },
}

/** Resolve a field label: explicit label > field key formatted as title case */
export function resolveFieldLabel(key: string, def: FieldDefinition): string {
  if (def.label) return def.label
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const DENSITY_ORDER: DensityLevel[] = ['always', 'standard', 'comfortable']

/** Returns true if a field should be rendered at the given density */
export function fieldPassesDensity(def: FieldDefinition, density: DensityLevel): boolean {
  if (def.always) return true
  if (!def.minDensity) return true
  return DENSITY_ORDER.indexOf(density) >= DENSITY_ORDER.indexOf(def.minDensity)
}
