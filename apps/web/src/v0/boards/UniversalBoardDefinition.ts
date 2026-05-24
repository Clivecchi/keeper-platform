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

// Left panel — Navigation
// What sections appear. What board nav integrations are present.
// Treatment character: orientation and confidence.
export interface NavSectionsDef {
  dialogs: boolean
  journeys: boolean
  keepers: boolean
  drafts: boolean
  agents: boolean
  /**
   * designer mode: show the Frames section (static list from BOARD_FRAMES[activeBoardForFrames]).
   * Selection fires onFrameSelect in UniversalBoardContext.
   */
  frames?: boolean
  /**
   * designer mode: show the Board Definitions section (all entries from BOARD_DEFINITIONS).
   * Selection fires onBoardDefSelect in UniversalBoardContext.
   */
  boardDefs?: boolean
}

export interface NavInstrumentDef {
  id: string
  label: string
}

export interface NavPanelDef {
  sections: NavSectionsDef
  /**
   * Board Nav layer — integration connections (IDE Board: Vercel, Railway, GitHub).
   * Visually distinct from Domain Nav record sections above.
   */
  integrations?: NavInstrumentDef[]
  /**
   * Which left-panel nav component the shell renders.
   * 'standard' (default) — UniversalNavPanel: Domain Nav + Board Nav layers.
   * 'switcher' — UniversalSwitcherPanel: frames + board definitions (Design Board only).
   * Omitting this field is equivalent to 'standard'.
   */
  variant?: 'standard' | 'switcher'
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
}

// Right panel — Living Multi-Context Surface
// What comes forward and what recedes as context shifts.
// Treatment character: presence and intentional interaction.
//
// presenceTreatment is a free-form instruction to the rendering layer (Rendr's input).
// Spatial ratios, motion behavior, density — those are Rendr's answer to this text.
export type PresenceSubject =
  | "journey"
  | "moment"
  | "keeper"
  | "agent"
  | "draft"
  | "service"
  | "domain"
  /** designer mode: selected frame — Chronicle renders DesignBoardFrameDetail */
  | "frame"
  /** designer mode: selected board definition — Chronicle renders BoardDefView */
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
  viewStates: ContextViewStateDef[]
  /** The subject rendered when nothing is selected. Always "domain". */
  idleSubject: "domain"
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
      dialogs: true,
      journeys: true,
      keepers: true,
      drafts: true,
      agents: false,
    },
    integrations: [
      { id: "vercel", label: "Vercel" },
      { id: "railway", label: "Railway" },
      { id: "github", label: "GitHub" },
    ],
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "domain",
    showServiceBar: true,
    kipMode: "ide",
  },
  contextSurface: {
    viewStates: [
      {
        key: "journey",
        presenceTreatment:
          "Journey alive. Paths and active Moments come forward. Threads surface. What is moving comes forward. What is settled recedes. The panel is aware of what Path you are on.",
      },
      {
        key: "moment",
        presenceTreatment:
          "Moment in focus. Content and narrative forward. Journey context present but quiet. Path prelude visible above the content.",
      },
      {
        key: "keeper",
        presenceTreatment:
          "Keeper present. Active journeys, recent sessions, purpose forward. Nothing is urgent. Just here.",
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
        key: "domain",
        presenceTreatment:
          "Domain breathing. Active journeys present — what is moving comes forward, what is settled is present but quiet. Not notifying. Not managing. Present.",
      },
    ],
    idleSubject: "domain",
  },
}

export const AGENT_BOARD_DEF: UniversalBoardDef = {
  boardId: "agent",
  displayName: "Agent Board",
  access: { isPrivate: true, isAdminOnly: false },
  nav: {
    sections: {
      dialogs: true,
      journeys: true,
      keepers: true,
      drafts: true,
      agents: true,
    },
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "agent",
    showServiceBar: false,
    kipMode: "agent",
  },
  contextSurface: {
    viewStates: [
      {
        key: "agent",
        presenceTreatment:
          "Agent present. Configuration and status forward. Recent runs surface. What is live comes forward. What is idle recedes.",
      },
      {
        key: "journey",
        presenceTreatment:
          "Journey alive. Paths and active Moments come forward. Threads surface. What is moving comes forward. What is settled recedes. The panel is aware of what Path you are on.",
      },
      {
        key: "moment",
        presenceTreatment:
          "Moment in focus. Content and narrative forward. Journey context present but quiet. Path prelude visible above the content.",
      },
      {
        key: "keeper",
        presenceTreatment:
          "Keeper present. Active journeys, recent sessions, purpose forward. Nothing is urgent. Just here.",
      },
      {
        key: "draft",
        presenceTreatment:
          "Draft in view. Agent spec and status forward. What needs attention surfaces first.",
      },
      {
        key: "domain",
        presenceTreatment:
          "Domain in view. Agents and their status present. What is running surfaces. What is idle is present but quiet.",
      },
    ],
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
    },
  },
  conversation: {
    agentSlug: "kip",
    agentName: "Kip",
    dialogueMode: "domain",
    showServiceBar: false,
    kipMode: "domain",
  },
  contextSurface: {
    viewStates: [
      {
        key: "journey",
        presenceTreatment:
          "Journey alive. Moments surface. Paths present. What is moving comes forward. What is settled is present but quiet.",
      },
      {
        key: "moment",
        presenceTreatment:
          "Moment in focus. Narrative and context forward. Journey context present but quiet.",
      },
      {
        key: "keeper",
        presenceTreatment:
          "Keeper present. Purpose and journeys forward. Nothing is urgent — just here.",
      },
      {
        key: "domain",
        presenceTreatment:
          "Domain overview. Journeys and recent activity present. What is alive surfaces. What is settled recedes.",
      },
    ],
    idleSubject: "domain",
  },
}

export const DESIGNER_BOARD_DEF: UniversalBoardDef = {
  boardId: "designer",
  displayName: "Design Board",
  access: { isPrivate: true, isAdminOnly: true, requiresDensity: true },
  nav: {
    variant: 'switcher',
    sections: {
      dialogs: false,
      journeys: false,
      keepers: false,
      drafts: false,
      agents: false,
      frames: true,
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
    viewStates: [
      {
        key: "frame",
        presenceTreatment:
          "Frame detail. Configuration, preview, and structure in view. Draft state surfaces when present. Direct-edit available on preview.",
      },
      {
        key: "boardDef",
        presenceTreatment:
          "Board definition in view. Structure and access rules present. Declarative spec forward.",
      },
      {
        key: "domain",
        presenceTreatment:
          "Design surface. Frame configuration in view. What is being edited surfaces. Structural context present.",
      },
    ],
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
