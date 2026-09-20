# Keeper Code Map — Jev X-Ray

Generated 2026-09-20T02:07:48.065Z. Model `jev-latest`. Key source: env.

## Run

- Units: 40 (40 ok, 0 failed)
- Questions per unit: 30
- Evaluations: 1200
- Duration: 3.0s
- Tokens (reported): input 230484, output 51574, total 282058
- Confidence: high 789 · medium 266 · low 145 · unknown 0

Low confidence is information. Do not flatten these to booleans.

## Stage-related code

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/services/rendr/expressResolvedMeaningOnStage.ts` | `expressResolvedMeaningOnStage` | yes | 1.00 |
| `apps/api/src/services/rendr/composeStageExpression.ts` | `composeStageExpression` | yes | 0.99 |
| `apps/api/src/api/domains/keeper-stage-routes.ts` | `keeperStageRoutes` | yes | 0.97 |
| `apps/api/src/api/kip/agents.ts` | `stage.story.layout` | yes | 0.97 |
| `apps/api/src/services/domains/keeperStageStore.ts` | `keeperStageStore` | yes | 0.96 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | yes | 0.92 |
| `apps/api/src/services/kip/layoutStageStory.ts` | `layoutStageStory` | yes | 0.86 |
| `packages/shared/src/domains/audienceVisibility.ts` | `isVisibleToAudience` | yes | 0.68 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | yes | 0.57 |
| `apps/api/src/capabilities/boardCapabilityCeilings.ts` | `boardCapabilityCeilings` | yes | 0.54 |
| `apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx` | `ChronicleActPresence` | yes | 0.46 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | yes | 0.42 |
| `apps/web/src/v0/shell/V0Shell.tsx` | `V0Shell` | yes | 0.35 |
| `apps/web/src/v0/presence/ChroniclePresenceView.tsx` | `ChroniclePresenceView` | yes | 0.32 |
| `apps/web/src/v0/presence/KeeperPresence.tsx` | `KeeperPresence` | yes | 0.29 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | yes | 0.28 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | yes | 0.26 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | yes | 0.26 |

## Dialog-related code

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | yes | 1.00 |
| `apps/api/src/api/kip/agents.ts` | `draft.update.propose` | yes | 0.92 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | yes | 0.77 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | yes | 0.54 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | yes | 0.45 |
| `apps/api/src/services/kip/documentTurnPostureShadow.ts` | `evaluateDocumentTurnPostureShadow` | yes | 0.37 |
| `packages/shared/src/humanTurn.ts` | `humanTurn` | yes | 0.27 |

## State mutation

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/services/domains/keeperStageStore.ts` | `keeperStageStore` | keeper-data | 1.00 |
| `apps/api/src/services/kip/layoutStageStory.ts` | `layoutStageStory` | keeper-data | 1.00 |
| `apps/api/src/api/domains/keeper-stage-routes.ts` | `keeperStageRoutes` | keeper-data | 1.00 |
| `apps/api/src/services/GlossWriteService.ts` | `GlossWriteService` | keeper-data | 1.00 |
| `apps/api/src/api/journeys.ts` | `journeysRoutes` | keeper-data | 1.00 |
| `apps/api/src/api/kip/agents.ts` | `stage.story.layout` | keeper-data | 1.00 |
| `apps/api/src/services/rendr/expressResolvedMeaningOnStage.ts` | `expressResolvedMeaningOnStage` | keeper-data | 0.99 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | keeper-data | 0.99 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | keeper-data | 0.99 |
| `apps/web/src/v0/presence/KeeperPresence.tsx` | `KeeperPresence` | keeper-data | 0.94 |
| `apps/api/src/services/kip/promoteDraftPoint.ts` | `promoteDraftPoint` | keeper-data | 0.94 |
| `apps/api/src/api/kip/agents.ts` | `draft.update.propose` | keeper-data | 0.93 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | keeper-data | 0.91 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | keeper-data | 0.50 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | keeper-data | 0.49 |

## Agency / capability infrastructure

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/services/rendr/expressResolvedMeaningOnStage.ts` | `expressResolvedMeaningOnStage` | yes | 1.00 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | yes | 1.00 |
| `apps/api/src/api/kip/agents.ts` | `typesafe.evaluate` | yes | 1.00 |
| `apps/api/src/capabilities/resolveCapabilities.ts` | `resolveAgentCapabilities` | resolve | 0.97 |
| `apps/api/src/services/TypeSafeEvaluateService.ts` | `runTypeSafeEvaluateAction` | yes | 0.95 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | grant | 0.94 |
| `apps/api/src/api/kip/agents.ts` | `typesafe.evaluate` | invoke | 0.93 |
| `apps/api/src/capabilities/capabilityLedger.ts` | `capabilityLedger` | resolve | 0.89 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | yes | 0.83 |
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | invoke | 0.81 |
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | yes | 0.80 |
| `apps/web/src/v0/data/resolveAudience.ts` | `resolveAudience` | resolve | 0.80 |
| `apps/api/src/api/kip/agents.ts` | `stage.story.layout` | invoke | 0.73 |
| `apps/api/src/services/rendr/expressResolvedMeaningOnStage.ts` | `expressResolvedMeaningOnStage` | invoke | 0.64 |
| `apps/api/src/api/kip/agents.ts` | `stage.story.layout` | yes | 0.63 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | yes | 0.60 |
| `apps/api/src/api/kip/agents.ts` | `draft.update.propose` | invoke | 0.58 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | invoke | 0.53 |
| `apps/api/src/middleware/requireCapability.ts` | `requireCapability` | verify | 0.53 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | invoke | 0.52 |
| `apps/api/src/policy/kipActionAllowlist.ts` | `GOLDEN_PATH_ACTIONS` | multiple | 0.47 |
| `apps/api/src/services/kip/documentTurnPostureShadow.ts` | `evaluateDocumentTurnPostureShadow` | yes | 0.45 |
| `apps/api/src/services/kip/documentTurnPostureShadow.ts` | `evaluateDocumentTurnPostureShadow` | multiple | 0.44 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | verify | 0.42 |
| `apps/api/src/services/TypeSafeEvaluateService.ts` | `runTypeSafeEvaluateAction` | invoke | 0.41 |
| `packages/shared/src/domains/audienceVisibility.ts` | `isVisibleToAudience` | verify | 0.38 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | invoke | 0.32 |
| `apps/api/src/capabilities/boardCapabilityCeilings.ts` | `boardCapabilityCeilings` | multiple | 0.21 |

## Possible legacy architecture

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `packages/shared/src/universalBoardId.ts` | `normalizeUniversalBoardId` | transitional | 0.88 |
| `apps/web/src/components/engagement/EngagementForm.tsx` | `EngagementForm` | yes | 0.88 |
| `apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx` | `ChronicleActPresence` | yes | 0.86 |
| `apps/web/src/v0/data/resolveAudience.ts` | `resolveAudience` | legacy | 0.85 |
| `apps/web/src/v0/shell/V0Shell.tsx` | `V0Shell` | yes | 0.74 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | yes | 0.73 |
| `apps/web/src/v0/shell/V0Shell.tsx` | `V0Shell` | transitional | 0.71 |
| `apps/web/src/components/engagement/EngagementForm.tsx` | `EngagementForm` | transitional | 0.70 |
| `apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx` | `ChronicleActPresence` | transitional | 0.66 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | yes | 0.63 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | transitional | 0.62 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | transitional | 0.59 |
| `packages/shared/src/universalBoardId.ts` | `normalizeUniversalBoardId` | yes | 0.54 |
| `apps/api/src/api/journeys.ts` | `journeysRoutes` | transitional | 0.49 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | yes | 0.48 |
| `packages/shared/src/humanTurn.ts` | `humanTurn` | transitional | 0.46 |
| `apps/web/src/v0/presence/KeeperPresence.tsx` | `KeeperPresence` | yes | 0.46 |
| `apps/web/src/v0/frames/present/PresentFrame.tsx` | `PresentFrame` | transitional | 0.42 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | transitional | 0.42 |
| `apps/web/src/v0/frames/present/PresentFrame.tsx` | `PresentFrame` | yes | 0.31 |

## Reliability seams

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx` | `ChronicleActPresence` | likely | 0.46 |
| `apps/api/src/api/journeys.ts` | `journeysRoutes` | likely | 0.46 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | likely | 0.46 |
| `apps/api/src/services/domains/keeperStageStore.ts` | `keeperStageStore` | likely | 0.34 |
| `apps/api/src/services/kip/layoutStageStory.ts` | `layoutStageStory` | likely | 0.33 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | likely | 0.27 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | likely | 0.20 |

## Capability-literacy seams

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | likely | 0.51 |
| `apps/api/src/services/kip/documentTurnPostureShadow.ts` | `evaluateDocumentTurnPostureShadow` | likely | 0.30 |
| `packages/shared/src/documentTurnPosture.ts` | `DOCUMENT_TURN_POSTURE_QUESTIONS` | likely | 0.24 |

## Architectural ambiguity

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | unlikely | 0.06 |
| `apps/web/src/v0/shell/V0Shell.tsx` | `V0Shell` | unclear | 0.07 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | unclear | 0.07 |
| `apps/api/src/api/kip/agents.ts` | `executeAgentActions` | unclear | 0.07 |
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | yes | 0.13 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | unclear | 0.14 |
| `packages/shared/src/domains/audienceVisibility.ts` | `isVisibleToAudience` | no | 0.15 |
| `apps/api/src/services/kip/promoteDraftPoint.ts` | `promoteDraftPoint` | yes | 0.15 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | likely | 0.16 |
| `apps/api/src/api/kip/agents.ts` | `draft.update.propose` | no | 0.18 |
| `apps/web/src/v0/presence/integrationChronicle/capabilityGrantUtils.ts` | `capabilityGrantUtils` | yes | 0.18 |
| `apps/api/src/services/kip/promoteDraftPoint.ts` | `promoteDraftPoint` | unclear | 0.19 |
| `apps/api/src/api/kip/agents.ts` | `draft.update.propose` | unlikely | 0.19 |
| `apps/api/src/services/kip/layoutStageStory.ts` | `layoutStageStory` | no | 0.20 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | likely | 0.20 |
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | likely | 0.20 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | likely | 0.21 |
| `apps/api/src/capabilities/boardCapabilityCeilings.ts` | `boardCapabilityCeilings` | multiple | 0.21 |
| `apps/web/src/v0/presence/KeeperPresence.tsx` | `KeeperPresence` | unlikely | 0.22 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | no | 0.22 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | yes | 0.22 |
| `apps/api/src/middleware/requireCapability.ts` | `requireCapability` | yes | 0.22 |
| `apps/web/src/v0/data/loadDomainFrame.ts` | `loadDomainFrame` | yes | 0.23 |
| `apps/web/src/v0/shell/V0Shell.tsx` | `V0Shell` | unlikely | 0.23 |
| `apps/web/src/hooks/useAgentDialog.ts` | `useAgentDialog` | unlikely | 0.23 |
| `apps/api/src/capabilities/resolveCapabilities.ts` | `resolveAgentCapabilities` | no | 0.23 |
| `apps/web/src/v0/data/loadDomainFrame.ts` | `loadDomainFrame` | no | 0.24 |
| `packages/shared/src/humanTurn.ts` | `humanTurn` | yes | 0.24 |
| `packages/shared/src/documentTurnPosture.ts` | `DOCUMENT_TURN_POSTURE_QUESTIONS` | likely | 0.24 |
| `apps/api/src/services/kip/promoteDraftPoint.ts` | `promoteDraftPoint` | high | 0.24 |
| `apps/api/src/services/TypeSafeProvider.ts` | `evaluateTypeSafe` | yes | 0.24 |
| `apps/api/src/services/rendr/composeStageExpression.ts` | `composeStageExpression` | yes | 0.25 |
| `apps/web/src/v0/presence/chronicleConfig/ChronicleActPresence.tsx` | `ChronicleActPresence` | yes | 0.25 |
| `apps/api/src/services/kip/documentTurnPostureShadow.ts` | `evaluateDocumentTurnPostureShadow` | yes | 0.25 |
| `apps/api/src/services/directorDialog.ts` | `directorDialog` | yes | 0.25 |
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | yes | 0.25 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | yes | 0.26 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | no | 0.26 |
| `apps/web/src/v0/boards/UniversalNavPanel.tsx` | `UniversalNavPanel` | yes | 0.26 |
| `packages/shared/src/humanTurn.ts` | `humanTurn` | no | 0.26 |
| … | 40 more | | |

## Discovery questions

These were added after inspecting the repository, not only to confirm known beliefs.

| Path | Symbol | Answer | Confidence |
|---|---|---|---|
| `apps/api/src/api/journey/domain-integrated-routes.ts` | `domainIntegratedJourneyRoutes` | secondImplementation:likely | 0.99 |
| `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` | `JourneysFrame` | secondImplementation:likely | 0.21 |

