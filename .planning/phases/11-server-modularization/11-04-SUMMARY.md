---
phase: 11-server-modularization
plan: 04
subsystem: server-orchestration
tags: altv, refactor, server, gsd

requires:
  - 11-03-PLAN.md
provides:
  - src/plugins/gta-mysql-core/server/bootstrap/createGameplayMysqlBundle.ts
  - src/plugins/gta-mysql-core/server/runtime/createPlayerRuntime.ts
  - src/plugins/gta-mysql-core/server/world/spawnStaticParkedVehicles.ts
affects:
  - src/plugins/gta-mysql-core/server/index.ts

tech-stack:
  added: []
  patterns:
    - "createGameplayMysqlBundle() for pool + migrations + service construction"
    - "createPlayerRuntime(ctx) for session/character/notify helpers"
    - "spawnStaticParkedVehicles in world/ module"

key-files:
  created:
    - src/plugins/gta-mysql-core/server/bootstrap/createGameplayMysqlBundle.ts
    - src/plugins/gta-mysql-core/server/runtime/createPlayerRuntime.ts
    - src/plugins/gta-mysql-core/server/world/spawnStaticParkedVehicles.ts
  modified:
    - src/plugins/gta-mysql-core/server/index.ts
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/PROJECT.md
    - .planning/phases/11-server-modularization/11-CONTEXT.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/CONCERNS.md

key-decisions:
  - "Plan **11-04-PLAN** authored before implementation (GSD-first for this slice)."
  - "Removed **`refreshPlayerMoney`** — zero call sites in `src/` (previously noted in phase 02 artifacts)."

requirements-completed:
  - REFACTOR-03

duration: n/a
completed: 2026-04-06
---

# Phase 11: Plan 11-04 Summary

**Final `index.ts` slimming:** MySQL pool + service construction → **`bootstrap/createGameplayMysqlBundle.ts`**; player/session/character/notify helpers → **`runtime/createPlayerRuntime.ts`**; static parked vehicle data + spawn → **`world/spawnStaticParkedVehicles.ts`**. **`server/index.ts`** ~**222** LOC — imports, service lets, **`getMySQLPool`**, maps, **`createPlayerRuntime`** destructure, **`register*()`** wiring, **`init`**.

## Verification

- **`pnpm run compile:ts`** — pass.
- **`alt.onClient`** — still none in **`index.ts`** (unchanged from **11-03**).

## Deviations

None.
