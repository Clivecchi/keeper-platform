"use client"

/**
 * usePresenceSchema
 * =================
 * Resolves the active ObjectPresenceSchema for a given object type and domain.
 *
 * Resolution order (highest precedence wins):
 *   1. Object-level presenceSchema (objectOverride) — parsed immediately, no fetch
 *   2. Domain-level PresenceSchema — fetched from GET /api/domains/:domainId/presence-schema/:objectType
 *   3. Platform defaults from KeeperPresenceDefaults.ts
 *
 * Caches domain-level schemas per "domainId:objectType" — does not re-fetch on
 * every render. Cache is module-level so it persists across component remounts.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import {
  PRESENCE_SCHEMA_DEFAULTS,
  type ObjectPresenceSchema,
  type DensityLevel,
} from "./KeeperPresenceDefaults"

export type { ObjectPresenceSchema, DensityLevel }

// ── Module-level cache ────────────────────────────────────────────────────────
// Maps "domainId:objectType" → ObjectPresenceSchema | null (null = 404/empty)
const domainSchemaCache = new Map<string, ObjectPresenceSchema | null>()
// Tracks in-flight fetches so concurrent callers don't duplicate requests
const domainSchemaInflight = new Map<string, Promise<ObjectPresenceSchema | null>>()

function parseDomainFields(raw: unknown): ObjectPresenceSchema | null {
  if (!raw || typeof raw !== "object") return null
  const fields = (raw as Record<string, unknown>).fields
  if (!fields || typeof fields !== "object") return null
  const objectType = (raw as Record<string, unknown>).objectType as string | undefined
  return { objectType: objectType ?? "unknown", fields: fields as ObjectPresenceSchema["fields"] }
}

async function fetchDomainSchema(
  domainId: string,
  objectType: string,
): Promise<ObjectPresenceSchema | null> {
  const cacheKey = `${domainId}:${objectType}`

  if (domainSchemaCache.has(cacheKey)) {
    return domainSchemaCache.get(cacheKey) ?? null
  }

  if (domainSchemaInflight.has(cacheKey)) {
    return domainSchemaInflight.get(cacheKey)!
  }

  const promise = apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/presence-schema/${encodeURIComponent(objectType)}`,
  )
    .then((res: unknown) => {
      const schema = parseDomainFields(res)
      domainSchemaCache.set(cacheKey, schema)
      return schema
    })
    .catch(() => {
      domainSchemaCache.set(cacheKey, null)
      return null
    })
    .finally(() => {
      domainSchemaInflight.delete(cacheKey)
    })

  domainSchemaInflight.set(cacheKey, promise)
  return promise
}

/** Invalidate a cached domain schema so the next render re-fetches. */
export function invalidatePresenceSchemaCache(domainId: string, objectType?: string): void {
  if (objectType) {
    domainSchemaCache.delete(`${domainId}:${objectType}`)
  } else {
    for (const key of domainSchemaCache.keys()) {
      if (key.startsWith(`${domainId}:`)) domainSchemaCache.delete(key)
    }
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UsePresenceSchemaResult {
  schema: ObjectPresenceSchema
  loading: boolean
}

/**
 * Resolves the active presence schema for an object.
 *
 * @param objectType  - e.g. 'journey', 'moment', 'keeper', 'agent', 'draft', 'dialog', 'service'
 * @param domainId    - the domain context
 * @param objectOverride - raw presenceSchema field from the record itself (JSON | null | undefined)
 */
export function usePresenceSchema(
  objectType: string,
  domainId: string | null,
  objectOverride?: Record<string, unknown> | null,
): UsePresenceSchemaResult {
  const platformDefault = PRESENCE_SCHEMA_DEFAULTS[objectType] ?? {
    objectType,
    fields: {},
  }

  // Level 1: object-level override — parse immediately, skip fetch entirely
  if (objectOverride && typeof objectOverride === "object") {
    const parsed = parseDomainFields({ ...objectOverride, objectType })
    if (parsed && Object.keys(parsed.fields).length > 0) {
      return { schema: parsed, loading: false }
    }
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [schema, setSchema] = React.useState<ObjectPresenceSchema>(platformDefault)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [loading, setLoading] = React.useState<boolean>(true)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    if (!domainId) {
      setSchema(platformDefault)
      setLoading(false)
      return
    }

    const cacheKey = `${domainId}:${objectType}`

    // Check cache synchronously first — avoid a loading flash on revisit
    if (domainSchemaCache.has(cacheKey)) {
      const cached = domainSchemaCache.get(cacheKey)
      setSchema(cached ?? platformDefault)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetchDomainSchema(domainId, objectType).then((domainSchema) => {
      if (cancelled) return
      setSchema(domainSchema ?? platformDefault)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainId, objectType])

  return { schema, loading }
}
