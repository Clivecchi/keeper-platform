import { prisma } from '@keeper/database';

export type AgentModeKey = 'domain' | 'debug';
export type OutputStyle = 'concise' | 'normal' | 'expanded';

export type ModeLimits = {
  maxChars?: number | null;
};

export type ModeConfig = {
  lensId?: string | null;
  outputStyle?: OutputStyle;
  limits?: ModeLimits;
  contextFlags?: Record<string, boolean>;
  captureN?: number;
  autoBrief?: boolean;
  includeFixPlan?: boolean;
};

export type AgentModeState = {
  activeMode: AgentModeKey;
  modeConfigs: Record<AgentModeKey, ModeConfig>;
};

export type LensRecord = {
  id: string;
  domainId: string | null;
  name: string;
  systemPrompt: string;
  rulesJson?: unknown;
  outputSchemaJson?: unknown;
};

type ModeConfigMap = Record<string, AgentModeState>;

const DEFAULT_CAPTURE_VALUES = [10, 20, 50] as const;
const DEFAULT_MAX_CHARS: Record<AgentModeKey, number> = {
  domain: 0,
  debug: 2000,
};
const DEFAULT_OUTPUT_STYLE: Record<AgentModeKey, OutputStyle> = {
  domain: 'normal',
  debug: 'concise',
};
const DEFAULT_CAPTURE_N = 20;
const DEFAULT_AUTO_BRIEF = true;
const DEFAULT_INCLUDE_FIX_PLAN = true;

const DEFAULT_DOMAIN_ID = 'default';
const DEFAULT_DOMAIN_LENS_NAME = 'Domain Lens';
const DEFAULT_DEBUG_LENS_NAME = 'Debug Investigator Lens';

const normalizeDomainKey = (domainId?: string | null): string =>
  domainId && typeof domainId === 'string' && domainId.trim() ? domainId.trim() : DEFAULT_DOMAIN_ID;

const clampCaptureN = (value?: number | null): number => {
  if (!value || Number.isNaN(value)) return DEFAULT_CAPTURE_N;
  if (DEFAULT_CAPTURE_VALUES.includes(value as any)) return value;
  if (value < 10) return 10;
  if (value > 50) return 50;
  if (value < 20) return 20;
  if (value < 50) return 50;
  return DEFAULT_CAPTURE_N;
};

const normalizeModeConfig = (
  mode: AgentModeKey,
  config: ModeConfig | undefined,
  fallbackLensId: string | null,
): ModeConfig => {
  const maxChars = typeof config?.limits?.maxChars === 'number' ? config.limits.maxChars : DEFAULT_MAX_CHARS[mode];
  const outputStyle = (config?.outputStyle as OutputStyle) || DEFAULT_OUTPUT_STYLE[mode];
  const contextFlags = config?.contextFlags && typeof config.contextFlags === 'object' ? config.contextFlags : {};
  const lensId = typeof config?.lensId === 'string' ? config.lensId : fallbackLensId;

  if (mode === 'debug') {
    return {
      lensId,
      outputStyle,
      limits: { maxChars },
      contextFlags,
      captureN: clampCaptureN(config?.captureN),
      autoBrief: config?.autoBrief ?? DEFAULT_AUTO_BRIEF,
      includeFixPlan: config?.includeFixPlan ?? DEFAULT_INCLUDE_FIX_PLAN,
    };
  }

  return {
    lensId,
    outputStyle,
    limits: { maxChars },
    contextFlags,
  };
};

const normalizeState = (
  state: AgentModeState | undefined,
  fallback: { domainLensId: string | null; debugLensId: string | null },
): AgentModeState => {
  const activeMode: AgentModeKey = state?.activeMode === 'debug' ? 'debug' : 'domain';
  const domainConfig = normalizeModeConfig('domain', state?.modeConfigs?.domain, fallback.domainLensId);
  const debugConfig = normalizeModeConfig('debug', state?.modeConfigs?.debug, fallback.debugLensId);

  return {
    activeMode,
    modeConfigs: {
      domain: domainConfig,
      debug: debugConfig,
    },
  };
};

const findDefaultLens = async (domainKey: string, name: string) => {
  const lens = await prisma.kip_lenses.findFirst({
    where: { domainId: domainKey, name },
    orderBy: { updatedAt: 'desc' },
  });
  if (lens) return lens;
  // Fallback to global default domain
  return prisma.kip_lenses.findFirst({
    where: { domainId: DEFAULT_DOMAIN_ID, name },
    orderBy: { updatedAt: 'desc' },
  });
};

export const resolveLensPair = async (domainId?: string | null): Promise<{
  domainLens: LensRecord | null;
  debugLens: LensRecord | null;
}> => {
  const domainKey = normalizeDomainKey(domainId);
  const domainLens = await findDefaultLens(domainKey, DEFAULT_DOMAIN_LENS_NAME);
  const debugLens = await findDefaultLens(domainKey, DEFAULT_DEBUG_LENS_NAME);
  return {
    domainLens: (domainLens as LensRecord | null) || null,
    debugLens: (debugLens as LensRecord | null) || null,
  };
};

export const loadModeState = async (
  agentId: string,
  domainId?: string | null,
): Promise<{
  state: AgentModeState;
  domainKey: string;
  lenses: { domainLensId: string | null; debugLensId: string | null };
  modeConfigByDomain: ModeConfigMap;
  agentConfig: Record<string, unknown>;
}> => {
  const domainKey = normalizeDomainKey(domainId);
  const agent = await prisma.kip_agents.findUnique({ where: { id: agentId } });
  if (!agent) {
    throw new Error('Agent not found');
  }

  const agentConfig = (agent.config as Record<string, unknown>) || {};
  const modeConfigByDomain = (agentConfig.modeConfigByDomain as ModeConfigMap | undefined) || {};
  const rawState = modeConfigByDomain[domainKey];

  const { domainLens, debugLens } = await resolveLensPair(domainKey);
  const fallbackLensIds = {
    domainLensId: domainLens?.id ?? null,
    debugLensId: debugLens?.id ?? null,
  };

  const state = normalizeState(rawState, fallbackLensIds);

  return {
    state,
    domainKey,
    lenses: fallbackLensIds,
    modeConfigByDomain,
    agentConfig,
  };
};

export const updateModeState = async (
  agentId: string,
  domainId: string | null | undefined,
  updates: Partial<AgentModeState>,
): Promise<AgentModeState> => {
  const { state: current, domainKey, lenses, modeConfigByDomain, agentConfig } = await loadModeState(agentId, domainId);

  const merged: AgentModeState = {
    activeMode: updates.activeMode === 'debug' ? 'debug' : updates.activeMode === 'domain' ? 'domain' : current.activeMode,
    modeConfigs: {
      domain: {
        ...current.modeConfigs.domain,
        ...(updates.modeConfigs?.domain || {}),
      },
      debug: {
        ...current.modeConfigs.debug,
        ...(updates.modeConfigs?.debug || {}),
      },
    },
  };

  const normalized = normalizeState(merged, lenses);
  const nextConfig = {
    ...agentConfig,
    modeConfigByDomain: {
      ...modeConfigByDomain,
      [domainKey]: normalized,
    },
  };

  await prisma.kip_agents.update({
    where: { id: agentId },
    data: {
      config: nextConfig,
      updated_at: new Date(),
    },
  });

  return normalized;
};
