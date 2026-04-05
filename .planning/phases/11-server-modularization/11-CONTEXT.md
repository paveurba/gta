# Phase 11: Server modularization — context

**Milestone:** v1.2  
**Requirements:** [REFACTOR-01](../../REQUIREMENTS.md) (**11-01**, **11-02**), [REFACTOR-02](../../REQUIREMENTS.md) (**11-03**), [REFACTOR-03](../../REQUIREMENTS.md) (**11-04**) — incremental extraction from `server/index.ts` (no big-bang).

## Principles

- **KISS:** One new file per domain slice; thin `register*()` that only wires `alt.onClient` (or lifecycle `alt.on`).
- **YAGNI:** No generic “event bus” or DI container; pass a small **context** object with only what handlers need.
- **SOLID (S):** Domain RPCs live in `register*ClientEvents`; lifecycle in `registerPlayerLifecycleEvents`; chat commands in `handleChatCommand`; `index.ts` orchestrates startup.

## Scope (all plans)

- **11-01 / 11-02:** `vehicle:*`, `property:*` client RPCs → registrars (**REFACTOR-01**).
- **11-03:** `playerConnect` / `Disconnect` / `Death`, `auth:*`, `gta:chat:send` + `/` commands, phone, weapon/clothing/casino shops → registrars + **`commands/handleChatCommand.ts`** (**REFACTOR-02**).
- **11-04:** Pool + services bootstrap, **`createPlayerRuntime`**, static parked spawns → **`bootstrap/`**, **`runtime/`**, **`world/`** (**REFACTOR-03**).

## Non-goals

- Changing behavior or RPC names.
- Client-side moves.

## Canonical files

- `src/plugins/gta-mysql-core/server/index.ts` — orchestration (~**220** LOC after **11-04**): `getMySQLPool` assignment from bundle, maps, `createPlayerRuntime` destructuring, `register*()` wiring, `init`.
- `server/bootstrap/createGameplayMysqlBundle.ts`, `server/runtime/createPlayerRuntime.ts`, `server/world/spawnStaticParkedVehicles.ts`, `server/events/register*.ts`, `server/commands/handleChatCommand.ts`, `server/types/playerSession.ts`.

---

*Phase: 11-server-modularization*
