/**
 * Compact authoritative Keeper architecture for Jev state.
 * Prefer typed distinctions over prose. Keep this small — state is shared by every question.
 */

export const KEEPER_XRAY_ARCHITECTURE_CONTEXT = {
  product: 'Keeper',
  scope: 'Domain-scoped. Truth, capability, and Document state are domain-bound.',
  objects: {
    Domain: 'Tenant of truth and capability. Not a page.',
    Stage: 'Room/screen on the current Board. Named composition of assets. Not the story. Not a Prisma table. Not ?board=stage.',
    Story: 'Single filmstrip told on Stage. Lives on Domain.settings.keeperStage.story.',
    Dialog: 'Conversation object. Selecting a Dialog resumes that conversation.',
    Point: 'Durable finding/content unit. Document Points are discussion until Keep lifts them.',
    Moment: 'Narrative beat in Domain → Keeper → Journey → Path → Moment.',
    Presence: 'Chronicle render of a subject (Focus / Config / Act).',
    Chronicle: 'Right panel. Exposes meaning, change, and state. Not a frame route.',
    Agent: 'Acts through capabilities. Availability is not operational knowledge.',
    Capability: 'Define / grant / resolve / invoke / verify. Grant ≠ instructions.',
    Document: 'Dialog workspace state. Not an EntityKind. Not the Object Glossary.',
  },
  surfaces: {
    member: 'Universal Board (?board=*). Nav selects; Dialog converses; Chronicle renders.',
    public: 'Present / Cover — guest read of kept story. Stage is where story is shaped first.',
    legacy: 'Standalone ?frame=* routes and EngagementForm on board Chronicle are transitional/legacy.',
  },
  agency: {
    rule: 'Capability availability is not capability knowledge.',
    verification: 'Favor observable/verified action over claimed success.',
    loop: 'Prefer X-ray → identify → investigate → act → verify over hunt/peck/paste.',
  },
  architectureState:
    'Current work is Stage/frame-oriented Universal Board. Legacy frames, dual Journey routes, and transitional Document write paths still exist.',
  evaluate: 'Judge semantic involvement, not keyword presence. Use unclear when evidence is insufficient.',
} as const;

export function architectureContextCharCount(): number {
  return JSON.stringify(KEEPER_XRAY_ARCHITECTURE_CONTEXT).length;
}
