---
phase: 11-server-modularization
plan: 03
subsystem: server-orchestration
tags: altv, refactor, server, gsd

requires:
  - 11-02-PLAN.md
provides:
  - server/types/playerSession.ts
  - server/commands/handleChatCommand.ts
  - server/events/registerPlayerLifecycleEvents.ts
  - server/events/registerAuthClientEvents.ts
  - server/events/registerChatClientEvents.ts
  - server/events/registerPhoneClientEvents.ts
  - server/events/registerWeaponShopClientEvents.ts
  - server/events/registerClothingShopClientEvents.ts
  - server/events/registerCasinoClientEvents.ts
affects:
  - server/events/registerVehicleClientEvents.ts
  - server/events/registerPropertyClientEvents.ts
  - server/index.ts

tech-stack:
  added: []
  patterns:
    - "ChatCommandDeps + handleChatCommand(deps, ...)"
    - "registerPlayerLifecycleEvents(ctx) for alt server lifecycle"
    - "PlayerSession shared type for getSession"

key-files:
  created:
    - src/plugins/gta-mysql-core/server/types/playerSession.ts
    - src/plugins/gta-mysql-core/server/commands/handleChatCommand.ts
    - src/plugins/gta-mysql-core/server/events/registerPlayerLifecycleEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerAuthClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerChatClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerPhoneClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerWeaponShopClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerClothingShopClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerCasinoClientEvents.ts
  modified:
    - src/plugins/gta-mysql-core/server/index.ts
    - src/plugins/gta-mysql-core/server/events/registerVehicleClientEvents.ts
    - src/plugins/gta-mysql-core/server/events/registerPropertyClientEvents.ts
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/PROJECT.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/CONCERNS.md

key-decisions:
  - "Implementation landed in commit d6c4e6b; this summary + 11-03-PLAN backfill GSD traceability."
  - "REFACTOR-02 requirement IDs the second extraction wave (lifecycle + auth + chat + shops + phone + casino)."

patterns-established:
  - "All alt.onClient groups in index replaced by register* calls after services/helpers exist."

requirements-completed:
  - REFACTOR-02

duration: n/a (retroactive GSD closure)
completed: 2026-04-06
git_ref: d6c4e6b
---

# Phase 11: Plan 11-03 Summary

**Remaining `server/index.ts` orchestration split:** lifecycle (**connect / disconnect / death**), **`auth:*`**, **`gta:chat:send`** + **`handleChatCommand`**, **phone**, **weapon/clothing/casino** shop RPCs — plus shared **`PlayerSession`** and **`ChatCommandDeps`**. **`index.ts`** (~423 LOC) wires **`register*()`** only for gameplay events; static parked spawns and session/login helpers remain.

## Deviations

- **GSD process:** Code shipped before **11-03-PLAN** / **11-03-SUMMARY** and roadmap/requirement updates; this plan documents **as-built** acceptance and completes traceability.

## Verification

- **`pnpm run compile:ts`** — pass at **d6c4e6b**.
