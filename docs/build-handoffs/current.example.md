# Build Handoff — capability-entitykind-design

**Goal:** Design and implement Capability EntityKind — Prisma model, cover schema, and focus orchestrator (recipe steps 1, 2, 4, 5).  
**Territory:** cursor  
**Branch:** cloud/handoff/capability-entitykind-design  
**Created:** 2026-06-17T12:00:00.000Z by cloud

## Done when

- Prisma model exists with chronicle_blocks and chronicle_actions defaults
- Migration applied without flattening Domain → Keeper hierarchy
- Cover renders five slots with real data after reload
- Focus orchestrator follows Key EntityKind pattern
- pnpm run smoke passes

## Canon (read first)

- @AGENTS.md
- @docs/entitykind-implementation-recipe.md
- @docs/keeper-heart-mind.md

## Scope

**Touch:** packages/database/prisma/schema.prisma, packages/database/prisma/migrations/, apps/web/src/v0/presence/  
**Do not touch:** apps/api/src/api/journey/domain-integrated-routes.ts

## Pattern

Key EntityKind — entitykind-implementation-recipe.md Section 4 steps 1–5, 7, 9, 11

## Rendr treatment

N/A — not a presence job

## Verification

**Commands:** pnpm run smoke  
**Browser:** /d/default?board=domain

## Constraints

- Match conventions in touched folders.
- Small focused diff.
- Do not commit unless Chuck asks.
- Codebase wins over docs when they conflict.

## Context

Mechanical follow-ups (PATCH route, post-save sync) are a separate cloud-territory handoff after this lands.
