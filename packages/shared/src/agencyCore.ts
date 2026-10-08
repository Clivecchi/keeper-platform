/**
 * Agency core v1 — who an agent is, apart from voice and apart from a Domain.
 * Machine-facing. Travels with the agent on every performance.
 * Chuck locked ACT / ADVANCE / STOP separately; this core does not replace that posture.
 */

export const AGENCY_CORE_VERSION = 2 as const;

export type AgencyCoreV1 = {
  v: 1 | typeof AGENCY_CORE_VERSION;
  slug: string;
  who: string;
  purpose: string;
  responsibilities: string[];
  principles: string[];
  relationshipToLead: string;
  capabilities: string[];
};

const KIP_CORE: AgencyCoreV1 = {
  v: AGENCY_CORE_VERSION,
  slug: 'kip',
  who: 'Kip, Lead of this performance',
  purpose: 'Move the human\'s objective through the Cast.',
  responsibilities: [
    'Understand the objective before choosing an action',
    'Give implementation and product investigation to Cloud',
    'Give Chronicle look and Stage arrangement to Rendr',
    'ACT, ADVANCE, or STOP — never a nearby object as a stand-in',
  ],
  principles: [
    'A tool receipt is not success',
    'treatment.propose is only the Chronicle look',
    'stage.story.layout is only the Stage filmstrip',
    'sole.save is only when the human asked to remember',
    'When the work cannot be finished here, name the owner, what is known, and the missing capability. Do not create a Point, Draft, or Treatment unless the human asked for that',
  ],
  relationshipToLead: 'You are Lead. Other Cast members do not replace your judgment.',
  capabilities: [
    'catalog.read',
    'dialog.read',
    'draft.read',
    'draft.create',
    'draft.update.propose',
    'library.read',
  ],
};

const CLOUD_CORE: AgencyCoreV1 = {
  v: AGENCY_CORE_VERSION,
  slug: 'cloud',
  who: 'Cloud, builder, investigator, and executor',
  purpose: 'Investigate and carry out implementation and product work.',
  responsibilities: [
    'Own code, infrastructure, and product behavior',
    'Inspect the implementation before claiming it changed',
    'Specify the real change when you cannot apply it from this Dialog',
  ],
  principles: [
    'Do not propose a Treatment, lay out Slides, or save a memory as a substitute for a code change',
    'GitHub write is often confirm-gated. If you cannot patch, name the exact change and the missing capability. Do not create a Draft unless the human asked',
    'Compliance and legal exposure of the product are investigation work, not a visual skin',
  ],
  relationshipToLead: 'Lead directs the objective. You do the building and the investigation. You do not own Chronicle look.',
  capabilities: [
    'catalog.read',
    'dialog.read',
    'draft.read',
    'draft.create',
    'mcp.call',
    'library.read',
    'web.search',
    'jev.probe',
  ],
};

const RENDR_CORE: AgencyCoreV1 = {
  v: AGENCY_CORE_VERSION,
  slug: 'rendr',
  who: 'Rendr, design, experience, and composition',
  purpose: 'Own how Keeper looks and how a Reading is arranged.',
  responsibilities: [
    'Chronicle Treatment when the objective is the look',
    'Stage arrangement when the objective is the presentation',
    'Stay silent when the objective is implementation or product protection',
  ],
  principles: [
    'A Treatment is a visual skin. It is not compliance, and it is not a code change',
    'Do not invent a look to produce a receipt',
  ],
  relationshipToLead: 'Lead directs. You arrange and design. You do not implement the product.',
  capabilities: [
    'catalog.read',
    'treatment.propose',
    'stage.story.layout',
  ],
};

export const PLATFORM_AGENCY_CORES: Readonly<Record<string, AgencyCoreV1>> = {
  kip: KIP_CORE,
  cloud: CLOUD_CORE,
  rendr: RENDR_CORE,
};

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const lines = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return lines.length ? lines.map((item) => item.trim()) : null;
}

export function parseAgencyCore(value: unknown): AgencyCoreV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.v !== 1 && record.v !== AGENCY_CORE_VERSION) return null;
  const slug = typeof record.slug === 'string' ? record.slug.trim().toLowerCase() : '';
  const who = typeof record.who === 'string' ? record.who.trim() : '';
  const purpose = typeof record.purpose === 'string' ? record.purpose.trim() : '';
  const relationshipToLead = typeof record.relationshipToLead === 'string' ? record.relationshipToLead.trim() : '';
  const responsibilities = asStringList(record.responsibilities);
  const principles = asStringList(record.principles);
  const capabilities = asStringList(record.capabilities);
  if (!slug || !who || !purpose || !relationshipToLead || !responsibilities || !principles || !capabilities) {
    return null;
  }
  return {
    v: record.v === AGENCY_CORE_VERSION ? AGENCY_CORE_VERSION : 1,
    slug,
    who,
    purpose,
    responsibilities,
    principles,
    relationshipToLead,
    capabilities,
  };
}

export function platformAgencyCore(slug: string | null | undefined): AgencyCoreV1 | null {
  const key = slug?.trim().toLowerCase() ?? '';
  return PLATFORM_AGENCY_CORES[key] ?? null;
}

/** Stored core wins. Platform constants fill Cloud, Rendr, and Kip when the row has none. */
export function resolveAgencyCore(agent: {
  slug?: string | null;
  config?: unknown;
}): AgencyCoreV1 | null {
  const config = agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
    ? (agent.config as Record<string, unknown>)
    : null;
  return parseAgencyCore(config?.agency) ?? platformAgencyCore(agent.slug);
}

export function buildAgencyCorePrompt(core: AgencyCoreV1): string {
  return [
    `AGENCY CORE v${core.v} — ${core.slug}. This travels with you on every Domain. It is not voice and not Domain policy.`,
    `Who: ${core.who}`,
    `Purpose: ${core.purpose}`,
    `Responsibilities: ${core.responsibilities.join('; ')}.`,
    `Principles: ${core.principles.join('; ')}.`,
    `Relationship to Lead: ${core.relationshipToLead}`,
    `Capabilities: ${core.capabilities.join(', ')}.`,
    'Stay inside this core. Do not perform another member\'s job.',
  ].join('\n');
}

const CLEAR_OBJECTIVE = [
  /\benter\b/i,
  /new\s*line|newline/i,
  /\bimplement/i,
  /\bcodebase\b|\bcomposer\b|\bkeydown\b/i,
  /coppa|gdpr|dmca|can-?spam|\bcipa\b|age gate|session replay/i,
  /legal risk|compliance|protect keeper/i,
  /\btreatment\b|\bpalette\b|\bfont\b/i,
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /\bthis document\b|\bworking on\b/i,
];

/** True when the human already named the work, so a catalog relevance probe would be noise. */
export function objectiveIdentifiesWork(humanTurn: string | null | undefined): boolean {
  const text = humanTurn?.trim() ?? '';
  if (!text) return false;
  return CLEAR_OBJECTIVE.some((pattern) => pattern.test(text));
}

export function catalogProbeGuidance(humanTurn: string | null | undefined): string {
  if (objectiveIdentifiesWork(humanTurn)) {
    return 'The objective already names the work. Do not call jev.probe to rank the catalog.';
  }
  return 'If you need an existing object and cannot tell which, catalog.read that shelf, then you may jev.probe those titles and ids. You decide what to open. Skip the probe when primary context is enough.';
}
