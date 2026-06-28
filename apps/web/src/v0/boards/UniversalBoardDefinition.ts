// apps/web/src/v0/boards/UniversalBoardDefinition.ts
// KE3P · Keeper Platform · Universal Board — Full Definition
//
// A Universal Board is three panels that act the same way, populated with different context.
// The shape is the standard. The content is the variable.
//
// A new Board = a new UniversalBoardDef object.
// Not a new component. Not a new conversation about what the panels should do.

// ─── Supporting Types ─────────────────────────────────────────────────────────

export type BoardId = "ide" | "agent" | "domain" | "designer" | (string & {})

/** How Dialog coordinates agents on this board — see docs/universal-board-dialog-orchestration.md */
export type DialogOrchestrationMode =
  | "solo"
  | "director"
  | "roundtable"
  | "hot_seat"
  | "chorus"

export type BoardInstrumentSlug = "cloud" | "rendr"

// Left panel — Navigation
// What sections appear. What board nav integrations are present.
// Treatment character: orientation and confidence.
export type NavSectionKey = "dialogs" | "journeys" | "keepers" | "drafts" | "agents" | "library" | "boardDefs"

/** Left-nav render blocks — entity sections plus board-layer sections. */
export type NavRenderBlock =
  | NavSectionKey
  | "integrations"
  | "keys"
  | "capabilities"
  | "library"
  | "boards"

export interface NavSectionsDef {
  dialogs: boolean
  journeys: boolean
  keepers: boolean
  drafts: boolean
  agents: boolean
  /** Domain Board: uploaded files and linked sources for the domain library. */
  library?: boolean
  /** IDE Board: platform capability registry grouped by kind. */
  capabilities?: boolean
  /**
   * designer mode: show the Board Definitions section (all entries from BOARD_DEFINITIONS).
   * Selection fires onBoardDefSelect in UniversalBoardContext.
   */
  boardDefs?: boolean
}

export interface NavInstrumentDef {
  id: string
  label: string
  /** Groups integrations in the left nav (IDE Board). */
  group?: "infrastructure" | "ai"
}

export interface NavPanelDef {
  sections: NavSectionsDef
  /**
   * When set, this section renders first (when enabled in sections).
   * Other boards omit — default nav order unchanged.
   */
  primarySection?: NavSectionKey
  /**
   * Full nav block order override. When omitted, UniversalNavPanel uses its default order.
   * Domain Board: Keeper → Dialogs → Journeys → Boards, then any remaining enabled sections.
   */
  navBlockOrder?: NavRenderBlock[]
  /** Override the Keepers section card title (Domain Board uses "Keeper"). */
  keeperSectionTitle?: string
  /**
   * Board Nav layer — integration connections (IDE Board: Vercel, Railway, GitHub).
   * Visually distinct from Domain Nav record sections above.
   */
  integrations?: NavInstrumentDef[]
}

// Center panel — Dialog Frame
// How the conversation frame behaves.
// Treatment character: exchange and momentum.
// The same surface everywhere — Banner · Dialog · Composer.
export interface ConversationPanelDef {
  /** Agent slug resolved via KipApi.getLeadAgent. Defaults to "kip". */
  agentSlug?: string
  agentName: string
  dialogueMode: "domain" | "agent"
  showServiceBar: boolean
  /** Which KipSession mode the conversation uses. Drives context injection and session behavior. */
  kipMode: "ide" | "agent" | "domain" | "designer"
  /**
   * Dialog orchestration — who owns the composer and how board instruments participate.
   * @default "solo" when omitted (legacy boards)
   */
  dialogOrchestration?: DialogOrchestrationMode
  /** Lead agent slug when dialogOrchestration is "director". Defaults to agentSlug / "kip". */
  directorAgentSlug?: string
  /** Invokable board instruments for director mode (agent slugs). */
  boardInstruments?: BoardInstrumentSlug[]
  /**
   * When true, the echo agent may attach an agent echo after a non-default agent's reply.
   * Echo agent — resolved from def.conversation.agentSlug for now; echo registry is a future layer.
   */
  agentEcho?: boolean
  /**
   * Capability ceiling for this board — agent capabilities are intersected with this set at runtime.
   * Declared as data; editable through Chronicle / Design Board in future steps.
   */
  allowedCapabilities?: string[]
}

// Right panel — Living Multi-Context Surface
// What comes forward and what recedes as context shifts.
// Treatment character: presence and intentional interaction.
//
// presenceTreatment is a free-form instruction to the rendering layer (Rendr's input).
// Spatial ratios, motion behavior, density — those are Rendr's answer to this text.
//
// IMPORTANT: viewStates declare treatment copy only. They do NOT gate Chronicle routing.
// Every board accepts every subject type; KeeperPresence renders all selections.
export type PresenceSubject =
  | "dialog"
  | "journey"
  | "moment"
  | "keeper"
  | "agent"
  | "draft"
  | "service"
  | "library"
  | "domain"
  | "boardDef"

export interface ContextViewStateDef {
  key: PresenceSubject
  /**
   * Free-form treatment instruction — the feeling this state should deliver.
   * Rendr reads this to determine spatial ratio, motion, density, what comes forward.
   */
  presenceTreatment: string
}

export interface ContextPanelDef {
  /** Treatment copy per subject — does not gate which subjects Chronicle responds to. */
  viewStates: ContextViewStateDef[]
  /** The subject rendered when nothing is selected. Always "domain". */
  idleSubject: "domain"
}

/** Default treatment copy for every Chronicle subject — all boards include every key. */
const UNIVERSAL_VIEW_STATE_DEFAULTS: ContextViewStateDef[] = [
  {
    key: "dialog",
    presenceTreatment:
      "Dialog in view. Scope and sessions forward. Where this conversation lives surfaces first.",
  },
  {
    key: "journey",
    presenceTreatment:
      "Journey alive. Paths and active Moments come forward. Threads surface. What is moving comes forward. What is settled recedes.",
  },
  {
    key: "moment",
    presenceTreatment:
      "Moment in focus. Content and narrative forward. Journey context present but quiet.",
  },
  {
    key: "keeper",
    presenceTreatment:
      "Keeper present. Active journeys, recent sessions, purpose forward. Nothing is urgent. Just here.",
  },
  {
    key: "agent",
    presenceTreatment:
      "Agent present. Configuration and status forward. Recent runs surface. What is live comes forward.",
  },
  {
    key: "draft",
    presenceTreatment:
      "Draft in view. Spec and status forward. Title prominent. What needs attention surfaces first.",
  },
  {
    key: "service",
    presenceTreatment:
      "Service connection surface. Status and controls forward. Other services present but quiet.",
  },
  {
    key: "boardDef",
    presenceTreatment:
      "Board definition in view. Structure and access rules present. Declarative spec forward.",
  },
  {
    key: "library",
    presenceTreatment:
      "Library item in view. Source reference and agent perspective forward. Assigned keeper and agent present but quiet.",
  },
  {
    key: "domain",
    presenceTreatment:
      "Domain breathing. Active journeys present — what is moving comes forward, what is settled is present but quiet.",
  },
]

/** Merge board-specific treatment overrides onto the universal subject list. */
export function mergeViewStates(
  overrides: Partial<Record<PresenceSubject, string>> = {},
): ContextViewStateDef[] {
  return UNIVERSAL_VIEW_STATE_DEFAULTS.map((vs) => ({
    ...vs,
    presenceTreatment: overrides[vs.key] ?? vs.presenceTreatment,
  }))
}

// Access control
export interface BoardAccessDef {
  isPrivate: boolean
  isAdminOnly: boolean
  /**
   * When true, UniversalBoard reads the stored density preference from localStorage,
   * applies `data-density` to document.documentElement, and persists changes.
   * Only boards that need density scaling (e.g. designer) should set this.
   */
  requiresDensity?: boolean
}

// ─── Primary Interface ────────────────────────────────────────────────────────

/** Infra + MCP capability ceiling for IDE Board — keep in sync with apps/api/src/capabilities/infraCapabilities.ts IDE_BOARD_MCP_CEILING */
const IDE_BOARD_ALLOWED_CAPABILITIES: string[] = [
  "infra.railway.read",
  "infra.railway.deploy",
  "infra.vercel.read",
  "infra.vercel.deploy",
  "infra.github.read",
  "infra.github.write",
  "infra.nango.read",
  "infra.resend.read",
  "github.repo.read",
  "github.commits.list",
  "github.branch.create",
  "github.file.write",
  "github.pr.create",
  "github.pr.read",
  "github.actions.status",
  "integrations.list",
  "nango.status.read",
  "resend.status.read",
]

/**
 * UniversalBoardDef
 *
 * The complete runtime definition of a Board.
 * A new Board is a new instance of this type — not a new component.
 *
 * Three panels. This shape. This feeling. Consistent across every Board.
 * The content changes. The shape does not. The treatment does not.
 */
export interface UniversalBoardDef {
  boardId: BoardId
  displayName: string
  access: BoardAccessDef
  /** Left panel — Navigation. Treatment: orientation and confidence. */
  nav: NavPanelDef
  /** Center panel — Dialog Frame. Treatment: exchange and momentum. */
  conversation: ConversationPanelDef
  /** Right panel — Living Multi-Context Surface. Treatment: presence and intentional interaction. */
  contextSurface: ContextPanelDef
}

// ─── Board Definitions ────────────────────────────────────────────────────────
// Each existing Board expressed as a UniversalBoardDef.
// Future boards are new entries here — not new components.

export const IDE_BOARD_DEF: UniversalBoardDef = {
  boardId: "ide",
  displayName: "IDE Board",
  access: { isPrivate: true, isAdminOnly: false },
  nav: {
    sections: {
      dialogs: false,
      journeys: false,
      keepers: false,
      drafts: true,
      agents: false,
      capabilities: true,
      boardDefs: false,
    },
    integrations: [
      { id: "vercel", label: "Vercel", group: "infrastructure" },
      { id: "railway", label: "Railway", group: "infrastructure" },
      { id: "github", label: "GitHub", group: "infrastructure" },
      { id: "anthropic", label: "Anthropic", group: "ai" },
      { id: "openai", label: "OpenAI", group: "ai" },
      { id: "together-ai", label: "Together AI", group: "ai" },
      { id: "elevenlabs", label: "ElevenLabs", group: "ai" },
    ],
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "domain",
    showServiceBar: true,
    kipMode: "ide",
    dialogOrchestration: "director",
    directorAgentSlug: "kip",
    boardInstruments: ["cloud", "rendr"],
    allowedCapabilities: IDE_BOARD_ALLOWED_CAPABILITIES,
  },
  contextSurface: {
    viewStates: mergeViewStates({
      service:
        "Service connection surface. Status and controls forward. Other services present but quiet.",
      domain:
        "Domain breathing. Active journeys present — what is moving comes forward, what is settled is present but quiet. Not notifying. Not managing. Present.",
    }),
    idleSubject: "domain",
  },
}

export const AGENT_BOARD_DEF: UniversalBoardDef = {
  boardId: "agent",
  displayName: "Agent Board",
  access: { isPrivate: true, isAdminOnly: false },
  nav: {
    sections: {
      dialogs: false,
      journeys: false,
      keepers: false,
      drafts: false,
      agents: true,
      boardDefs: false,
    },
    primarySection: "agents",
    // Keys + platform AI providers live on IDE Board only — not personal/platform Agent nav.
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "agent",
    showServiceBar: false,
    kipMode: "agent",
    dialogOrchestration: "solo",
    agentEcho: true,
  },
  contextSurface: {
    viewStates: mergeViewStates({
      agent:
        "Agent present. Composed prompt, configuration, and status forward. What is live comes forward. What is idle recedes.",
      draft:
        "Draft in view. Agent spec and status forward. What needs attention surfaces first.",
      domain:
        "Domain in view. Agents and their status present. What is running surfaces. What is idle is present but quiet.",
    }),
    idleSubject: "domain",
  },
}

export const DOMAIN_BOARD_DEF: UniversalBoardDef = {
  boardId: "domain",
  displayName: "Domain Board",
  access: { isPrivate: true, isAdminOnly: false },
  nav: {
    sections: {
      dialogs: true,
      journeys: true,
      keepers: true,
      drafts: false,
      agents: false,
      library: true,
      boardDefs: false,
    },
    navBlockOrder: ["keepers", "dialogs", "journeys", "library", "boards"],
    keeperSectionTitle: "Keeper",
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "domain",
    showServiceBar: false,
    kipMode: "domain",
  },
  contextSurface: {
    viewStates: mergeViewStates({
      journey:
        "Journey alive. Moments surface. Paths present. What is moving comes forward. What is settled is present but quiet.",
      moment:
        "Moment in focus. Narrative and context forward. Journey context present but quiet.",
      keeper:
        "Keeper present. Purpose and journeys forward. Nothing is urgent — just here.",
      domain:
        "Domain overview. Journeys and recent activity present. What is alive surfaces. What is settled recedes.",
    }),
    idleSubject: "domain",
  },
}

export const DESIGNER_BOARD_DEF: UniversalBoardDef = {
  boardId: "designer",
  displayName: "Design Board",
  access: { isPrivate: true, isAdminOnly: true },
  nav: {
    sections: {
      dialogs: false,
      journeys: false,
      keepers: false,
      drafts: false,
      agents: false,
      boardDefs: true,
    },
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "domain",
    showServiceBar: false,
    kipMode: "designer",
  },
  contextSurface: {
    viewStates: mergeViewStates({
      boardDef:
        "Board definition in view. Structure and access rules present. Declarative spec forward.",
      domain:
        "Design surface. Treatment and presence configuration in view. What governs how the domain feels and how objects surface.",
    }),
    idleSubject: "domain",
  },
}

// Registry of all board definitions — index by boardId
export const BOARD_DEFINITIONS: Record<string, UniversalBoardDef> = {
  ide: IDE_BOARD_DEF,
  agent: AGENT_BOARD_DEF,
  domain: DOMAIN_BOARD_DEF,
  designer: DESIGNER_BOARD_DEF,
}
