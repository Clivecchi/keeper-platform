/**
 * Stage orientation survives the presentation.
 * A pass may replace what is showing. It does not drop the places already entered,
 * or the story that belongs to the shell domain.
 */

import {
  selectStageTruth,
  type DomainAudienceRole,
  type StageTruthKey,
} from "@keeper/shared"

export type StagePresentationName = "where-we-are" | "story"

export type StageVisit = {
  scope: "realm" | "domain"
  domainId?: string
}

export type StageOrientationStep = {
  id: string
  label: string
  presentation: StagePresentationName
  visit: StageVisit
}

export type StageOrientation = {
  contextLabel: string
  onStageLabel: string
  currentStepId: string
  steps: readonly StageOrientationStep[]
  truth: StageTruthKey
}

export function stageVisitKey(visit: StageVisit): string {
  if (visit.scope === "realm") return "realm"
  return `domain:${visit.domainId ?? ""}`
}

export function appendStageVisit(visits: readonly StageVisit[], next: StageVisit): StageVisit[] {
  const key = stageVisitKey(next)
  if (visits.some((visit) => stageVisitKey(visit) === key)) return [...visits]
  return [...visits, next]
}

function placeLabel(visit: StageVisit, names: Readonly<Record<string, string>>): string {
  if (visit.scope === "realm") return "Realm"
  const named = visit.domainId ? names[visit.domainId]?.trim() : ""
  return named || "Domain"
}

function whereStep(visit: StageVisit, names: Readonly<Record<string, string>>): StageOrientationStep {
  return {
    id: `where:${stageVisitKey(visit)}`,
    label: placeLabel(visit, names),
    presentation: "where-we-are",
    visit,
  }
}

function storyStep(visit: StageVisit): StageOrientationStep {
  return {
    id: `story:${stageVisitKey(visit)}`,
    label: "Story",
    presentation: "story",
    visit,
  }
}

/** Story on Stage is the shell domain's stored filmstrip. Another domain does not borrow it. */
export function stageStoryAvailable(visit: StageVisit, shellDomainId: string | null | undefined): boolean {
  if (visit.scope !== "domain") return false
  const domainId = visit.domainId?.trim() ?? ""
  const shellId = shellDomainId?.trim() ?? ""
  return Boolean(domainId && shellId && domainId === shellId)
}

export function presentedStageTruth(input: {
  visit: StageVisit
  presentation: StagePresentationName | null
  audience: DomainAudienceRole
  arriving: boolean
}): StageTruthKey {
  if (input.presentation === "story") {
    if (input.visit.scope === "realm" && input.audience === "admin") return "realm-where-we-are"
    return "story"
  }
  if (input.presentation === "where-we-are") {
    if (input.audience !== "admin") return "story"
    return input.visit.scope === "realm" ? "realm-where-we-are" : "domain-where-we-are"
  }
  return selectStageTruth({
    scope: input.visit.scope,
    ...(input.visit.domainId ? { domainId: input.visit.domainId } : {}),
    audience: input.audience,
    arriving: input.arriving,
  })
}

export function buildStageOrientation(input: {
  visits: readonly StageVisit[]
  cursor: number
  presentation: StagePresentationName | null
  audience: DomainAudienceRole
  arriving: boolean
  shellDomainId?: string | null
  names?: Readonly<Record<string, string>>
  /** Current slide title while the story is showing. */
  slideTitle?: string | null
}): StageOrientation {
  const names = input.names ?? {}
  const visits = input.visits.length > 0 ? input.visits : [{ scope: "realm" as const }]
  const cursor = Math.min(Math.max(input.cursor, 0), visits.length - 1)
  const visit = visits[cursor] ?? visits[0]!
  const truth = presentedStageTruth({
    visit,
    presentation: input.presentation,
    audience: input.audience,
    arriving: input.arriving,
  })
  const steps: StageOrientationStep[] = []
  for (const entered of visits) {
    if (input.audience === "admin") steps.push(whereStep(entered, names))
    if (stageStoryAvailable(entered, input.shellDomainId)) steps.push(storyStep(entered))
  }
  const contextLabel = placeLabel(visit, names)
  const slideTitle = input.slideTitle?.trim() ?? ""
  const onStageLabel =
    truth === "story" ? slideTitle || "Story" : "Where are we?"
  const current =
    truth === "realm-where-we-are"
      ? whereStep({ scope: "realm" }, names)
      : truth === "domain-where-we-are"
        ? whereStep(visit, names)
        : visit.scope === "domain"
          ? storyStep(visit)
          : null
  return {
    contextLabel,
    onStageLabel,
    currentStepId: current && steps.some((step) => step.id === current.id) ? current.id : "",
    steps,
    truth,
  }
}
