// apps/web/src/v0/boards/UniversalBoardSchema.ts
// KE3P · Keeper Platform · Moment 2.1
// Universal Board Schema — schema definition only. No Board component is modified.
// This file documents the current confirmed state of all four Boards and defines
// the interface every Board will conform to during Moment 2.2 reconciliation.

// ---------------------------------------------------------------------------
// Supporting Interface: UniversalBoardViewState
// ---------------------------------------------------------------------------

/**
 * A single named state the right panel can be in.
 * Formalizes what is currently scattered inline conditional logic across Boards.
 */
export interface UniversalBoardViewState {
  /** Named key for this state. e.g. "journey", "moment", "draft", "idle" */
  key: string
  /** The Board-level variable whose truthy value activates this state. e.g. "activeJourneyId" */
  triggerVariable: string
  /** The React component that renders in the right panel for this state. e.g. "KeeperJourneyPanel" */
  componentName: string
  /**
   * true if the component is shared across Boards
   * (KeeperViewPanel, HomeViewPanel, KeeperJourneyPanel).
   * false if Board-specific.
   */
  isShared: boolean
  /** true for the idle/fallback state. Only one view state per Board should have isDefault: true. */
  isDefault: boolean
}

// ---------------------------------------------------------------------------
// Supporting Interface: UniversalBoardDataFetch
// ---------------------------------------------------------------------------

/**
 * Documents what a Board fetches on mount.
 * Describes duplication — does not fix it yet.
 */
export interface UniversalBoardDataFetch {
  /** Plain-language description. e.g. "domainId from /api/domains/by-slug/[slug]" */
  description: string
  /**
   * true if this same fetch exists in one or more other Boards.
   * Documents duplication — does not fix it yet.
   */
  isDuplicated: boolean
}

// ---------------------------------------------------------------------------
// Primary Interface: UniversalBoardSchema
// ---------------------------------------------------------------------------

/**
 * The primary schema interface. Every Board is an instance of this shape.
 * Canonical definition for all Universal Board work in Path 2.
 */
export interface UniversalBoardSchema {
  /** Canonical key. Maps to boardRegistry.ts keys. */
  boardId: "ide" | "agent" | "domain" | "designer"

  /** Human-readable label used in navigation and registry. */
  displayName: string

  /**
   * Access control. Migrated from boardRegistry.ts. Belongs in the schema.
   * Source of truth: boardRegistry.ts BOARD_REGISTRY entries.
   */
  access: {
    isPrivate: boolean
    isAdminOnly: boolean
  }

  /**
   * "panel-group" = KeeperBoardPanelGroup (resizable, persisted).
   * "fixed" = hardcoded flex layout.
   * Going forward all Boards use "panel-group".
   * This field documents current divergence honestly.
   */
  layoutEngine: "panel-group" | "fixed"

  /**
   * ownsDialogFrame: true means the Board renders KeeperDialogFrame at root.
   * false means a sub-component handles it.
   */
  centerPanel: {
    ownsDialogFrame: boolean
    componentName: string
  }

  /**
   * Named, ordered list of right panel states.
   * Formalizes what is currently scattered inline conditional logic.
   */
  rightPanel: {
    viewStates: UniversalBoardViewState[]
  }

  /** What this Board fetches on mount. Documents duplication. Does not fix it yet. */
  dataFetches: UniversalBoardDataFetch[]

  /** Which context hooks this Board consumes. */
  contextDependencies: Array<"useV0Shell" | "useFrameContextOptional" | "useAuth">

  /**
   * Selection ID variables that live at Board level as useState.
   * Documents current state. Does not change anything.
   */
  sharedState: string[]

  /**
   * Free-form notes from the diagnostic. Defects, gaps, TODOs.
   * Visible in the schema so they travel with the Board.
   */
  diagnosticNotes: string[]
}

// ---------------------------------------------------------------------------
// Constants: One per Board, populated from diagnostic-confirmed facts.
// Values not confirmed by diagnostic are marked // TODO: verify
// ---------------------------------------------------------------------------

/**
 * IDE Board — visual reference standard.
 * Agent Board's structural discipline + IDE Board's visual standard = Universal Board target.
 */
export const IDE_BOARD_SCHEMA: UniversalBoardSchema = {
  boardId: "ide",
  displayName: "IDE Board",
  access: {
    // boardRegistry.ts confirms isPrivate: true for all boards.
    // Schema document listed isPrivate: false — that diverges from registry. // TODO: verify intent
    isPrivate: true,
    isAdminOnly: false,
  },
  layoutEngine: "panel-group",
  centerPanel: {
    // IDEBoardConversation sub-component owns KeeperDialogFrame, not the Board root.
    ownsDialogFrame: false,
    componentName: "IDEBoardConversation",
  },
  rightPanel: {
    viewStates: [
      {
        key: "service",
        triggerVariable: "activeService",
        componentName: "ServicesFrame", // TODO: verify exact component name
        isShared: false,
        isDefault: false,
      },
      {
        key: "journey",
        triggerVariable: "activeJourneyId",
        componentName: "KeeperJourneyPanel",
        isShared: true,
        isDefault: false,
      },
      {
        key: "draft",
        triggerVariable: "selectedDraftId",
        componentName: "IDEDraftPanel", // TODO: verify exact component name
        isShared: false,
        isDefault: false,
      },
      {
        key: "moment",
        triggerVariable: "selectedMomentId",
        componentName: "IDEDraftPanel", // TODO: verify — draft/moment may share component
        isShared: false,
        isDefault: false,
      },
      {
        key: "keeper",
        triggerVariable: "selectedKeeperId",
        componentName: "KeeperViewPanel",
        isShared: true,
        isDefault: false,
      },
      {
        key: "idle",
        triggerVariable: "",
        componentName: "HomeViewPanel",
        isShared: true,
        isDefault: true,
      },
    ],
  },
  dataFetches: [
    // TODO: verify — specific fetch descriptions for IDE Board not confirmed in diagnostic
  ],
  contextDependencies: ["useV0Shell", "useFrameContextOptional"],
  sharedState: [
    "activeJourneyId",
    "activeSessionId",
    "selectedDraftId",
    "selectedMomentId",
    "selectedKeeperId",
  ],
  diagnosticNotes: [
    "Visual reference standard. All Universal Boards render to this visual standard.",
    "activeKeeperId is read from useFrameContextOptional, not Board-owned state.",
    "Mutual exclusion of selection IDs (draft/moment/keeper/journey) is enforced manually per callback — not abstracted.",
    "IDEBoardConversation sub-component owns KeeperDialogFrame, not the Board root.",
    "5 right panel view states confirmed: service, journey, draft, moment, keeper, plus idle fallback.",
  ],
}

/**
 * Agent Board — structural model.
 * Clean delegation to named sub-components, small footprint, KeeperBoardPanelGroup.
 * Visual state is behind IDE standard; left nav has a confirmed defect.
 */
export const AGENT_BOARD_SCHEMA: UniversalBoardSchema = {
  boardId: "agent",
  displayName: "Agent Board",
  access: {
    // boardRegistry.ts confirms isPrivate: true.
    // Schema document listed isPrivate: false — diverges from registry. // TODO: verify intent
    isPrivate: true,
    isAdminOnly: false,
  },
  layoutEngine: "panel-group",
  centerPanel: {
    // AgentBoardConversation sub-component owns KeeperDialogFrame, not the Board root.
    ownsDialogFrame: false,
    componentName: "AgentBoardConversation",
  },
  rightPanel: {
    viewStates: [
      {
        // Moment 2.2: Board-level draft view state — fires when selectedDraftId && domainId are both non-null.
        key: "draft",
        triggerVariable: "selectedDraftId",
        componentName: "AgentBoardPanel",
        isShared: false,
        isDefault: false,
      },
      {
        // Moment 2.2: Board-level agent view state — fires when selectedAgentId is non-null.
        key: "agent",
        triggerVariable: "selectedAgentId",
        componentName: "AgentBoardPanel",
        isShared: false,
        isDefault: false,
      },
      {
        // Moment 2.2: Named idle state — AgentBoardIdlePanel replaces anonymous inline block.
        key: "idle",
        triggerVariable: "",
        componentName: "AgentBoardIdlePanel",
        isShared: false,
        isDefault: true,
      },
    ],
  },
  dataFetches: [
    // TODO: verify — specific fetch descriptions for Agent Board not confirmed in diagnostic
  ],
  contextDependencies: ["useV0Shell"],
  sharedState: [
    "selectedAgentId",
    "selectedDraftId",
  ],
  diagnosticNotes: [
    "DEFECT RESOLVED (Moment 2.2): Left nav Keeper drop fixed — AgentBoardNav now receives domainId from Board, eliminating duplicate domain slug resolution.",
    "Structural model for Universal Boards: clean delegation, small footprint, KeeperBoardPanelGroup.",
    "Board-level view state surfaced in Moment 2.2: draft | agent | idle branching is now in AgentBoard, not AgentBoardPanel.",
    "AgentBoardIdlePanel created in Moment 2.2 — named component matching HomeViewPanel visual standard.",
    "AgentBoardPanel now accepts mode prop (\"draft\" | \"agent\") — Board determines mode, panel renders accordingly.",
    "selectedAgentId and selectedDraftId are mutually exclusive selection IDs.",
    "domainError state added in Moment 2.2 — failed domainId fetch renders visible error, not silent null.",
  ],
}

/**
 * Domain Board — most divergent Board. 723 lines.
 * Reconciliation is Moment 2.2 last (after Agent, IDE, Design).
 */
export const DOMAIN_BOARD_SCHEMA: UniversalBoardSchema = {
  boardId: "domain",
  displayName: "Domain Board",
  access: {
    // boardRegistry.ts confirms isPrivate: true.
    // Schema document listed isPrivate: false — diverges from registry. // TODO: verify intent
    isPrivate: true,
    isAdminOnly: false,
  },
  layoutEngine: "fixed",
  centerPanel: {
    // DomainBoard is the ONLY Board that owns KeeperDialogFrame at root level.
    ownsDialogFrame: true,
    componentName: "DomainBoard",
  },
  rightPanel: {
    viewStates: [
      {
        key: "journey",
        triggerVariable: "activeJourneyId",
        componentName: "KeeperJourneyPanel",
        isShared: true,
        isDefault: false,
      },
      {
        key: "moment",
        triggerVariable: "selectedMoment",
        // Moment detail is an anonymous inline block in DomainBoard — not a named component yet.
        componentName: "DomainBoardMomentDetail", // TODO: verify — currently an anonymous inline block
        isShared: false,
        isDefault: false,
      },
      {
        key: "keeper",
        triggerVariable: "wordmark", // TODO: verify — diagnostic noted wordmark as the keeper trigger
        componentName: "KeeperViewPanel",
        isShared: true,
        isDefault: false,
      },
      {
        key: "idle",
        triggerVariable: "",
        componentName: "HomeViewPanel",
        isShared: true,
        isDefault: true,
      },
    ],
  },
  dataFetches: [
    {
      description: "domainId from /api/domains/by-slug/[slug]", // TODO: verify exact endpoint path
      isDuplicated: true,
    },
  ],
  contextDependencies: ["useV0Shell"],
  sharedState: [
    "activeJourneyId",
    // No activeSessionId confirmed in diagnostic.
    // No activeKeeperId confirmed in diagnostic.
  ],
  diagnosticNotes: [
    "Most divergent Board. 723 lines. Most structural work required to conform.",
    "layoutEngine is 'fixed' — raw div flex with 220px left panel, 380px right panel. KeeperBoardPanelGroup NOT used.",
    "Only Board that owns KeeperDialogFrame at root level — all others delegate to sub-component.",
    "Left nav is inline JSX with no named component. Must be extracted.",
    "onSessionSelect is a stub with console.log and TODO — not implemented.",
    "Moment detail in right panel is an anonymous inline block — not a named component.",
    "BADGE_STYLES and BANNER_BADGE_STYLES are inline constants — not extracted.",
    "No activeSessionId. No activeKeeperId. Narrowest shared state of any Board.",
    "Does not move in Moment 2.2 until Agent Board, IDE Board, and Design Board patterns are proven.",
  ],
}

/**
 * Design Board — most structurally isolated Board. Admin-only.
 * Zero shared panel components. Unique density sub-bar chrome.
 * Structural gaps are bounded; reconciliation is third in Moment 2.2 sequence.
 */
export const DESIGN_BOARD_SCHEMA: UniversalBoardSchema = {
  boardId: "designer",
  displayName: "Design Board",
  access: {
    isPrivate: true,
    isAdminOnly: true,
  },
  layoutEngine: "fixed",
  centerPanel: {
    // KeeperDialogFrame is NOT used anywhere in DesignBoard.
    ownsDialogFrame: false,
    componentName: "DesignBoard",
  },
  rightPanel: {
    viewStates: [
      {
        key: "frame-detail",
        triggerVariable: "activeFrameKey",
        componentName: "DesignBoardFrameDetail",
        isShared: false,
        isDefault: false,
      },
      {
        key: "idle",
        triggerVariable: "",
        componentName: "DesignBoardEmptyState", // TODO: verify exact empty state component/element name
        isShared: false,
        isDefault: true,
      },
    ],
  },
  dataFetches: [
    // TODO: verify — specific fetch descriptions for Design Board not confirmed in diagnostic
  ],
  contextDependencies: ["useV0Shell", "useAuth"],
  sharedState: [
    "activeFrameKey",
    "activeBoardId",
    "draftId",
    "dialogId",
    "draftSpecJson",
  ],
  diagnosticNotes: [
    "Most structurally isolated Board. Zero shared panel components.",
    "KeeperDialogFrame NOT used anywhere — only Board with no dialog frame dependency.",
    "layoutEngine is 'fixed' — raw div flex with 220px left, 42% right (min 320px). KeeperBoardPanelGroup NOT used.",
    "Has unique density sub-bar chrome not present on other Boards.",
    "Has admin gate (isAdminOnly: true). Only Board with admin restriction.",
    "Background hardcoded to #f5f2eb — not using shared atmospheric background standard.",
    "dialogId is the only Board doing server-side viewState hydration on activeFrameKey change.",
    "Reconciliation is third in Moment 2.2 sequence (after Agent Board and IDE Board).",
  ],
}
