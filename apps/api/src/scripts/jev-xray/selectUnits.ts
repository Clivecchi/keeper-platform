/**
 * Curated Keeper units for the first Jev X-ray.
 * Prefer a meaningful slice over dumping an entire 9k-line file.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { XrayPreparedUnit, XrayUnitSpec } from './types.js';

export const MAX_UNIT_CHARS = 14_000;

export const KEEPER_XRAY_UNIT_CATALOG: XrayUnitSpec[] = [
  { path: 'apps/web/src/v0/data/loadDomainFrame.ts', symbol: 'loadDomainFrame', unitType: 'resolver' },
  { path: 'apps/web/src/v0/data/resolveAudience.ts', symbol: 'resolveAudience', unitType: 'resolver' },
  { path: 'packages/shared/src/universalBoardId.ts', symbol: 'normalizeUniversalBoardId', unitType: 'type' },
  { path: 'packages/shared/src/domains/audienceVisibility.ts', symbol: 'isVisibleToAudience', unitType: 'type' },
  { path: 'apps/web/src/v0/shell/V0Shell.tsx', symbol: 'V0Shell', unitType: 'component' },
  { path: 'apps/api/src/services/domains/keeperStageStore.ts', symbol: 'keeperStageStore', unitType: 'service' },
  { path: 'apps/api/src/services/kip/layoutStageStory.ts', symbol: 'layoutStageStory', unitType: 'function' },
  { path: 'apps/api/src/services/rendr/composeStageExpression.ts', symbol: 'composeStageExpression', unitType: 'service' },
  { path: 'apps/api/src/services/rendr/expressResolvedMeaningOnStage.ts', symbol: 'expressResolvedMeaningOnStage', unitType: 'service' },
  { path: 'apps/api/src/api/domains/keeper-stage-routes.ts', symbol: 'keeperStageRoutes', unitType: 'route' },
  { path: 'apps/web/src/v0/frames/present/PresentFrame.tsx', symbol: 'PresentFrame', unitType: 'component' },
  { path: 'apps/web/src/v0/frames/journeys/JourneysFrame.tsx', symbol: 'JourneysFrame', unitType: 'component' },
  { path: 'apps/web/src/components/engagement/EngagementForm.tsx', symbol: 'EngagementForm', unitType: 'component' },
  { path: 'apps/web/src/v0/boards/UniversalNavPanel.tsx', symbol: 'UniversalNavPanel', unitType: 'component' },
  { path: 'apps/web/src/v0/presence/KeeperPresence.tsx', symbol: 'KeeperPresence', unitType: 'component' },
  { path: 'apps/web/src/v0/presence/ChroniclePresenceView.tsx', symbol: 'ChroniclePresenceView', unitType: 'component' },
  { path: 'apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx', symbol: 'ChronicleActPresence', unitType: 'component' },
  { path: 'apps/web/src/hooks/useAgentDialog.ts', symbol: 'useAgentDialog', unitType: 'function' },
  { path: 'packages/shared/src/humanTurn.ts', symbol: 'humanTurn', unitType: 'type' },
  { path: 'packages/shared/src/documentTurnPosture.ts', symbol: 'DOCUMENT_TURN_POSTURE_QUESTIONS', unitType: 'type' },
  { path: 'apps/api/src/services/kip/documentTurnPostureShadow.ts', symbol: 'evaluateDocumentTurnPostureShadow', unitType: 'service' },
  { path: 'apps/api/src/services/directorDialog.ts', symbol: 'directorDialog', unitType: 'service' },
  { path: 'packages/shared/src/draftPoints.ts', symbol: 'createDraftPoint', unitType: 'function', extract: { kind: 'export', name: 'createDraftPoint' } },
  { path: 'apps/api/src/services/kip/promoteDraftPoint.ts', symbol: 'promoteDraftPoint', unitType: 'function', extract: { kind: 'export', name: 'promoteDraftPoint' } },
  { path: 'apps/api/src/services/GlossWriteService.ts', symbol: 'GlossWriteService', unitType: 'service' },
  { path: 'apps/api/src/api/journeys.ts', symbol: 'journeysRoutes', unitType: 'route' },
  {
    path: 'apps/api/src/api/journey/domain-integrated-routes.ts',
    symbol: 'domainIntegratedJourneyRoutes',
    unitType: 'route',
    note: 'Known inactive dual Journey path — not mounted.',
  },
  { path: 'apps/api/src/policy/kipActionAllowlist.ts', symbol: 'GOLDEN_PATH_ACTIONS', unitType: 'capability' },
  { path: 'apps/api/src/capabilities/resolveCapabilities.ts', symbol: 'resolveAgentCapabilities', unitType: 'resolver' },
  { path: 'apps/api/src/capabilities/capabilityLedger.ts', symbol: 'capabilityLedger', unitType: 'capability' },
  { path: 'apps/api/src/middleware/requireCapability.ts', symbol: 'requireCapability', unitType: 'capability' },
  { path: 'apps/api/src/services/TypeSafeEvaluateService.ts', symbol: 'runTypeSafeEvaluateAction', unitType: 'capability' },
  { path: 'apps/api/src/services/TypeSafeProvider.ts', symbol: 'evaluateTypeSafe', unitType: 'function', extract: { kind: 'export', name: 'evaluateTypeSafe' } },
  { path: 'apps/web/src/components/agent/SystemOneOrientationCard.tsx', symbol: 'SystemOneOrientationCard', unitType: 'component' },
  {
    path: 'apps/api/src/api/kip/agents.ts',
    symbol: 'executeAgentActions',
    unitType: 'function',
    extract: { kind: 'export', name: 'executeAgentActions' },
  },
  {
    path: 'apps/api/src/api/kip/agents.ts',
    symbol: 'draft.update.propose',
    unitType: 'capability',
    extract: { kind: 'marker', needle: "case 'draft.update.propose':", before: 8, after: 80 },
  },
  {
    path: 'apps/api/src/api/kip/agents.ts',
    symbol: 'stage.story.layout',
    unitType: 'capability',
    extract: { kind: 'marker', needle: "case 'stage.story.layout':", before: 8, after: 70 },
  },
  {
    path: 'apps/api/src/api/kip/agents.ts',
    symbol: 'typesafe.evaluate',
    unitType: 'capability',
    extract: { kind: 'marker', needle: "case 'typesafe.evaluate':", before: 8, after: 70 },
  },
  { path: 'apps/api/src/capabilities/boardCapabilityCeilings.ts', symbol: 'boardCapabilityCeilings', unitType: 'capability' },
  { path: 'apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts', symbol: 'capabilityGrantUtils', unitType: 'capability' },
];

export function repoPath(repoRoot: string, relative: string): string {
  return join(repoRoot, ...relative.split('/'));
}

export function extractExport(source: string, name: string): string | null {
  const patterns = [
    new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`, 'm'),
    new RegExp(`^export\\s+class\\s+${name}\\b`, 'm'),
    new RegExp(`^export\\s+(?:const|type|interface)\\s+${name}\\b`, 'm'),
    new RegExp(`^export\\s+async\\s+function\\s+${name}\\b`, 'm'),
  ];
  let start = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match && match.index >= 0) {
      start = match.index;
      break;
    }
  }
  if (start < 0) return null;

  const fromStart = source.slice(start);
  const nextExport = fromStart.slice(1).search(/^export\s+/m);
  const slice = nextExport >= 0 ? fromStart.slice(0, nextExport + 1) : fromStart;
  return slice.trim();
}

export function extractMarker(
  source: string,
  needle: string,
  before = 12,
  after = 80,
): string | null {
  const index = source.indexOf(needle);
  if (index < 0) return null;
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const beforeText = source.slice(0, lineStart);
  const beforeLines = beforeText.split('\n');
  const startLine = Math.max(0, beforeLines.length - before);
  const afterText = source.slice(lineStart);
  const afterLines = afterText.split('\n');
  return [...beforeLines.slice(startLine), ...afterLines.slice(0, after + 1)].join('\n').trim();
}

function truncate(code: string): { code: string; truncated: boolean } {
  if (code.length <= MAX_UNIT_CHARS) return { code, truncated: false };
  return {
    code: `${code.slice(0, MAX_UNIT_CHARS)}\n\n/* … truncated for Jev state budget … */`,
    truncated: true,
  };
}

export function prepareUnit(repoRoot: string, spec: XrayUnitSpec): XrayPreparedUnit | null {
  const absolute = repoPath(repoRoot, spec.path);
  if (!existsSync(absolute)) return null;
  const source = readFileSync(absolute, 'utf8');
  const extract = spec.extract ?? { kind: 'file' as const };

  let code: string | null = source;
  if (extract.kind === 'export') {
    code = extractExport(source, extract.name);
  } else if (extract.kind === 'marker') {
    code = extractMarker(source, extract.needle, extract.before, extract.after);
  }

  if (!code?.trim()) return null;
  const clipped = truncate(code);
  return {
    path: spec.path,
    symbol: spec.symbol,
    unitType: spec.unitType,
    note: spec.note,
    code: clipped.code,
    truncated: clipped.truncated,
    charCount: clipped.code.length,
  };
}

export function prepareUnits(
  repoRoot: string,
  specs: XrayUnitSpec[] = KEEPER_XRAY_UNIT_CATALOG,
): { units: XrayPreparedUnit[]; missing: XrayUnitSpec[] } {
  const units: XrayPreparedUnit[] = [];
  const missing: XrayUnitSpec[] = [];
  for (const spec of specs) {
    const prepared = prepareUnit(repoRoot, spec);
    if (prepared) units.push(prepared);
    else missing.push(spec);
  }
  return { units, missing };
}
