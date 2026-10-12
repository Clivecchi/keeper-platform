/**
 * Read-only identity check for the Operational Truth manuscript.
 * Does not write, delete, or reimport.
 */
import 'dotenv/config'
import { createHash } from 'node:crypto'
import { prisma } from '@keeper/database'

const DIALOG_ID = 'cmv04yrn50001otb8mwjrj0as'
const THIRD_IMPORT = '2026-10-11T00:03:25.942Z'

type PointRow = {
  id?: string
  content?: string
  status?: string
  proposedBy?: string
  createdAt?: string
  updatedAt?: string
  prelude?: string
  pathGroupId?: string
}

function bodyHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function preludeOf(point: PointRow): string {
  const prelude = point.prelude?.trim()
  if (prelude) return prelude
  const line = (point.content ?? '').split('\n').map((row) => row.trim()).find(Boolean) ?? ''
  return line.slice(0, 120)
}

const draft = await prisma.kip_drafts.findFirst({
  where: { dialog_id: DIALOG_ID, kind: 'document_manuscript' },
  select: { id: true, updated_at: true, spec_json: true },
})

if (!draft) {
  console.log(JSON.stringify({ found: false, dialogId: DIALOG_ID }))
  await prisma.$disconnect()
  process.exit(0)
}

const spec = draft.spec_json && typeof draft.spec_json === 'object' && !Array.isArray(draft.spec_json)
  ? draft.spec_json as { points?: unknown; sections?: unknown }
  : {}
const points = Array.isArray(spec.points) ? spec.points as PointRow[] : []
const sections = Array.isArray(spec.sections) ? spec.sections as Array<{ id?: string; title?: string; pointIds?: string[] }> : []

const byHash = new Map<string, string[]>()
for (const point of points) {
  const id = point.id ?? ''
  const hash = bodyHash(point.content ?? '')
  const list = byHash.get(hash) ?? []
  list.push(id)
  byHash.set(hash, list)
}

const sectionFor = new Map<string, string>()
for (const section of sections) {
  const title = section.title ?? section.id ?? ''
  for (const pointId of section.pointIds ?? []) sectionFor.set(pointId, title)
}

const late = points.filter((point) => (point.createdAt ?? '') > THIRD_IMPORT)
const report = {
  found: true,
  draftId: draft.id,
  updatedAt: draft.updated_at.toISOString(),
  pointCount: points.length,
  sectionCount: sections.length,
  lateCount: late.length,
  late: late.map((point) => {
    const hash = bodyHash(point.content ?? '')
    const matches = (byHash.get(hash) ?? []).filter((id) => id !== point.id)
    return {
      id: point.id,
      status: point.status,
      proposedBy: point.proposedBy,
      createdAt: point.createdAt,
      updatedAt: point.updatedAt,
      pathGroupId: point.pathGroupId ?? null,
      section: point.id ? sectionFor.get(point.id) ?? null : null,
      prelude: preludeOf(point),
      contentChars: (point.content ?? '').length,
      excerpt: (point.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 280),
      duplicateOf: matches,
    }
  }),
}

console.log(JSON.stringify(report, null, 2))
await prisma.$disconnect()
