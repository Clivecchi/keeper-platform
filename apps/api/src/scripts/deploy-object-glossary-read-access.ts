/**
 * Deploy Keeper Object Glossary — Library Item + Training Mode Governance inject.
 *
 * 1. Upserts a domain LibraryItem (source_type: github) pointing at
 *    docs/keeper-object-glossary.md, with a Keeper-native agent_perspective
 *    so library.read returns useful content without GitHub credentials.
 * 2. Optionally catalogs the EntityKind Recipe the same way (pattern twin).
 * 3. Patches Kip (and Cloud) config.voice_prompt ## 4. Governance with a
 *    condensed glossary canon + library.read pointer.
 *
 * Defaults to dry-run; writes only with --execute.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/deploy-object-glossary-read-access.ts
 *   npx tsx src/scripts/deploy-object-glossary-read-access.ts --execute
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import { embedLibraryItemPerspective } from '../services/LibraryItemEmbeddingService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const DOMAIN_SLUG = 'ke3p';
const REPO_ROOT = path.resolve(__dirname, '../../../..');

const GLOSSARY_SOURCE_REF = 'docs/keeper-object-glossary.md';
const RECIPE_SOURCE_REF = 'docs/entitykind-implementation-recipe.md';

const GOVERNANCE_MARKER_START = '<!-- keeper-object-glossary:start -->';
const GOVERNANCE_MARKER_END = '<!-- keeper-object-glossary:end -->';

/** Condensed canon for Training Mode Governance — small enough for every turn. */
const GOVERNANCE_GLOSSARY_BLOCK = `${GOVERNANCE_MARKER_START}
### Keeper Object Glossary (governing canon)

Authoritative vocabulary: repo path \`${GLOSSARY_SOURCE_REF}\` (same tier as the EntityKind Recipe). Cataloged as a Library Item (\`source_type: github\`) — read via \`library.read\` (search query "Object Glossary" or by item id). Do not invent platform object meanings; prefer this glossary over memory when terms conflict.

**Sacred data hierarchy:** Domain → Keeper → Journey → Path → Moment.

**Document Section ≠ Journey Path**
- **Journey Path** — Prisma \`Path\` row under a Journey; holds Moments. Narrative structure.
- **Document Section** — declared group for Document Points on a Dialog (JSON \`document_paths\` / pathGroupId today). Product language is "Section." Not a Journey Path row and not an EntityKind.
- **Document** — Dialog workspace state (freeform scaffolding), not a separate EntityKind. Never call the Object Glossary a "Document."

**Library** — domain-scoped connective index (\`LibraryItem\`), not a hierarchy layer. Points at uploads/URLs/github/docs; does not replace Drafts or SOLE.

**EntityKind (UI pattern)** — cover · Chronicle · Config · Nav. Fully wired today: Key, Capability, LibraryItem, Keeper. Partial: Integration, Agent, Domain, Journey, Path, Moment, Draft, Dialog.

**Board-emphasis invariant:** Switching boards may change what's emphasized about a Chronicle Subject (facet, density, Lead, controls up front). It must never change the subject's identity or the actions available on it. Standing exceptions pending the Document-tree/Presence-tree fork: Draft, Moment, Library, Domain-idle. Board labels: Realm · Domain · Build (internal key \`ide\`) · Design · Agent.

When answering what a platform object *is*, use glossary definitions. Call \`library.read\` for fuller entries when needed.
${GOVERNANCE_MARKER_END}`;

const GLOSSARY_PERSPECTIVE = `Keeper Object Glossary — governing platform vocabulary (working v1).

Repo source: ${GLOSSARY_SOURCE_REF} (source_type: github). Same governing tier as the EntityKind Implementation Recipe.

Sacred hierarchy: Domain → Keeper → Journey → Path → Moment.

Critical distinction — Document Section vs Journey Path:
- Journey Path = Prisma Path under a Journey; contains Moments; narrative hierarchy.
- Document Section = Dialog document_paths / pathGroupId groups for Document Points. Product language "Section." Not a Journey Path and not an EntityKind.
- Document = Dialog state (freeform workspace), not a separate EntityKind / Prisma model.

Other core objects (code-derived):
- Domain — top-level tenant/workspace; frame_json experience surface.
- Keeper — content container under Domain; parents Journeys/Paths.
- Journey — named narrative under Keeper; parents Paths and Moments.
- Moment — kept narrative unit (title + narrative).
- Session (kip_sessions) — agent chat session; may belong to a Dialog.
- Dialog — persistent conversation container; carries Document fields.
- Draft (kip_drafts) — working spec with DraftPoints; not the Document itself.
- Agent (kip_agents) — Lead/System/etc.; Training Mode voice_prompt sections.
- LibraryItem — connective index row (upload/url/github/gdrive/draft).
- Integration / Key / Capability — EntityKind-pattern platform objects.
- Treatment — not a Prisma model; theme/treatment live in Domain/frame JSON.

EntityKind status: Fully wired — Key, Capability, LibraryItem, Keeper. Partial — Integration, Agent, Domain, Journey, Path, Moment, Draft, Dialog.

Use this item via library.read for object definitions. Full text remains in the git-backed docs file.`;

const RECIPE_PERSPECTIVE = `EntityKind Implementation Recipe — governing build checklist for EntityKinds (cover, Chronicle, Config, Nav). Repo source: ${RECIPE_SOURCE_REF} (source_type: github). Key is the reference implementation. Seven layers: cover schema, Focus presence, Chronicle blocks, Config presence + save shell, PATCH endpoint, Nav utilities, DB declaration columns. Does not cover Board structure, Treatment, or Training Mode (additive on agents).`;

type CatalogSpec = {
  sourceRef: string;
  displayLabel: string;
  description: string;
  perspective: string;
  category: string[];
};

const CATALOG_ITEMS: CatalogSpec[] = [
  {
    sourceRef: GLOSSARY_SOURCE_REF,
    displayLabel: 'Keeper Object Glossary',
    description:
      'Governing platform vocabulary (working v1). Document Section ≠ Journey Path; sacred hierarchy Domain→Keeper→Journey→Path→Moment.',
    perspective: GLOSSARY_PERSPECTIVE,
    category: ['governance', 'canon', 'glossary'],
  },
  {
    sourceRef: RECIPE_SOURCE_REF,
    displayLabel: 'EntityKind Implementation Recipe',
    description:
      'Governing EntityKind build recipe — cover, Chronicle, Config, Nav (Key as reference).',
    perspective: RECIPE_PERSPECTIVE,
    category: ['governance', 'canon', 'entitykind'],
  },
];

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

function upsertGovernanceBlock(existingGovernance: string): string {
  const trimmed = existingGovernance.trim();
  if (trimmed.includes(GOVERNANCE_MARKER_START) && trimmed.includes(GOVERNANCE_MARKER_END)) {
    const before = trimmed.slice(0, trimmed.indexOf(GOVERNANCE_MARKER_START)).trimEnd();
    const after = trimmed
      .slice(trimmed.indexOf(GOVERNANCE_MARKER_END) + GOVERNANCE_MARKER_END.length)
      .trimStart();
    return [before, GOVERNANCE_GLOSSARY_BLOCK, after].filter(Boolean).join('\n\n').trim();
  }
  if (!trimmed) return GOVERNANCE_GLOSSARY_BLOCK;
  return `${trimmed}\n\n${GOVERNANCE_GLOSSARY_BLOCK}`;
}

function patchVoicePrompt(raw: string | null | undefined): string {
  const text = raw?.trim() ?? '';
  const delimiter = '## 4. Governance';
  if (!text.includes(delimiter)) {
    const base = text || '## Currently\n\n## 1. Identity\n\n## 2. Behavior\n\n## 3. Capabilities\n';
    return `${base}\n\n${delimiter}\n${GOVERNANCE_GLOSSARY_BLOCK}`.trim();
  }

  const parts = text.split(/^## 4\. Governance\s*$/m);
  const before = (parts[0] ?? '').trimEnd();
  const afterGovernance = (parts[1] ?? '').trim();
  // Governance body may be followed by nothing (end of prompt)
  const nextHeader = afterGovernance.search(/^## /m);
  const govBody = nextHeader >= 0 ? afterGovernance.slice(0, nextHeader).trim() : afterGovernance;
  const remainder = nextHeader >= 0 ? afterGovernance.slice(nextHeader).trim() : '';
  const newGov = upsertGovernanceBlock(govBody);
  return [before, `${delimiter}\n${newGov}`, remainder].filter(Boolean).join('\n\n').trim();
}

async function upsertLibraryItem(
  domainId: string,
  spec: CatalogSpec,
  execute: boolean,
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.libraryItem.findFirst({
    where: {
      domain_id: domainId,
      source_type: 'github',
      source_ref: spec.sourceRef,
    },
    select: { id: true },
  });

  if (!execute) {
    console.log(
      `  [dry-run] ${existing ? 'update' : 'create'} LibraryItem github → ${spec.sourceRef}`,
    );
    return { id: existing?.id ?? '(new)', created: !existing };
  }

  if (existing) {
    const updated = await prisma.libraryItem.update({
      where: { id: existing.id },
      data: {
        display_label: spec.displayLabel,
        description: spec.description,
        agent_perspective: spec.perspective,
        category: spec.category,
        updated_at: new Date(),
      },
      select: { id: true },
    });
    return { id: updated.id, created: false };
  }

  const created = await prisma.libraryItem.create({
    data: {
      domain_id: domainId,
      source_type: 'github',
      source_ref: spec.sourceRef,
      display_label: spec.displayLabel,
      description: spec.description,
      agent_perspective: spec.perspective,
      category: spec.category,
      chronicle_blocks: ['cover', 'declaration'],
      chronicle_actions: [],
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

async function patchAgentGovernance(slug: string, execute: boolean): Promise<void> {
  const agent = await prisma.kip_agents.findFirst({
    where: { slug },
    select: { id: true, name: true, config: true },
  });
  if (!agent) {
    console.log(`  ⚠ No agent with slug "${slug}" — skipped`);
    return;
  }

  const config =
    agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
      ? ({ ...(agent.config as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const previous =
    typeof config.voice_prompt === 'string' ? (config.voice_prompt as string) : '';
  const next = patchVoicePrompt(previous);

  if (previous.trim() === next.trim()) {
    console.log(`  ✓ ${agent.name} (${slug}) Governance already up to date`);
    return;
  }

  if (!execute) {
    console.log(`  [dry-run] patch ${agent.name} (${slug}) config.voice_prompt Governance`);
    return;
  }

  await prisma.kip_agents.update({
    where: { id: agent.id },
    data: {
      config: { ...config, voice_prompt: next } as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });
  console.log(`  ✓ Patched ${agent.name} (${slug}) Governance with Object Glossary block`);
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Deploy Object Glossary Read Access (${mode}) ===\n`);

  const glossaryPath = path.join(REPO_ROOT, GLOSSARY_SOURCE_REF);
  if (!fs.existsSync(glossaryPath)) {
    throw new Error(`Missing ${GLOSSARY_SOURCE_REF} — land the file before deploying read access`);
  }

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true, slug: true },
  });
  if (!domain) throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);
  console.log(`Domain: ${domain.slug} (${domain.id})`);

  console.log('\nLibrary Items:');
  for (const spec of CATALOG_ITEMS) {
    const result = await upsertLibraryItem(domain.id, spec, execute);
    console.log(
      `  ${result.created ? 'created' : 'updated'} ${spec.displayLabel} → ${result.id}`,
    );
    if (execute && result.id !== '(new)') {
      const embedded = await embedLibraryItemPerspective(result.id, spec.perspective, null);
      console.log(`  embedding: ${embedded ? 'stored' : 'skipped (no key or failure)'}`);
    }
  }

  console.log('\nTraining Mode Governance inject:');
  for (const slug of ['kip', 'cloud']) {
    await patchAgentGovernance(slug, execute);
  }

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  console.log('\nDone. Agents can library.read the glossary; Kip/Cloud Governance carries condensed canon.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
