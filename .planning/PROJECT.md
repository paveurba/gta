# GTA (alt:V Rebar server)

## What This Is

A **GTA Online–style alt:V multiplayer server** built on the **Rebar** framework: players authenticate, earn and spend money, own properties and vehicles, use a phone, visit shops and the casino, and play in a cleaned world (no ambient traffic/peds) with map blips and static parked cars. Persistence uses **MySQL** for custom gameplay data and **MongoDB** for Rebar core; **Docker Compose** is the documented way to run the stack.

## Current state (shipped)

- **v1.0** completed **2026-04-06** (GSD phases 1–6, 18 plans, 34 v1 requirements). Archives: [`.planning/milestones/v1.0-ROADMAP.md`](.planning/milestones/v1.0-ROADMAP.md), [`.planning/milestones/v1.0-REQUIREMENTS.md`](.planning/milestones/v1.0-REQUIREMENTS.md). Summary: [`.planning/MILESTONES.md`](.planning/MILESTONES.md). Git tag: **`v1.0`**.

## Next milestone goals (candidates)

_Not scheduled._ Typical follow-ups from `.planning/codebase/CONCERNS.md` and archived **v2** ideas: **automated tests** (TEST-01), **CI compile/lint** (TEST-02), **optional MAIL-01**, and **splitting or modularizing** `server/index.ts` when change velocity demands it. Define scope with **`$gsd-new-milestone`**.

## Core Value

Players can **join the server, persist a character economy (cash/bank), and use the documented gameplay loops** (auth, money, housing, vehicles, weapons, clothing, phone, casino, world markers) **reliably against MySQL-backed state**.

## Requirements

### Validated

- ✓ **alt:V + Rebar server** runs with compiled `resources/core` — existing
- ✓ **MySQL persistence** for players, money, weapons, clothes, vehicles, properties, phone, casino, transaction log — existing (`database/init/001_schema.sql`, migrations)
- ✓ **MongoDB** for Rebar core — existing (Compose service + `MONGODB` env)
- ✓ **Authentication** — register/login via **Auth UI** (**T**) and `AuthService` — existing
- ✓ **Money** — cash and bank with commands — existing
- ✓ **Phone** — contacts and SMS between players — existing
- ✓ **Properties** — buy/sell/enter/exit, garages — existing
- ✓ **Vehicles** — buy/sell/spawn/store in garages — existing
- ✓ **Weapon & clothing shops** — purchase and persistence — existing
- ✓ **Casino** — slots and roulette — existing
- ✓ **World UX** — blips, static parked vehicles, hospital respawn fee — existing
- ✓ **Vue webview** bundle builds to `resources/webview`; core gameplay HUDs are **native** client — existing
- ✓ **Docker workflow** — `docker compose` + `pnpm refresh` documented — existing

### Active

- [ ] Keep **documentation, planning, and codebase map** aligned with shipped behavior as the repo evolves
- [ ] Address **technical debt** called out in `.planning/codebase/CONCERNS.md` (e.g. test gap, large `server/index.ts`) as priorities emerge

### Out of Scope

- **Single-player or non–alt:V** GTA V modes — different product surface
- **Official Rockstar GTA Online** backend compatibility — not a goal

## Context

- Brownfield codebase: primary plugin `src/plugins/gta-mysql-core/` with long `server/index.ts` orchestration and dedicated **services** / **repositories**.
- See `.planning/codebase/ARCHITECTURE.md` and `STACK.md` for structure and dependencies.
- Public feature and command reference: root `README.md`.

## Constraints

- **Tech stack:** alt:V, Rebar, TypeScript, MySQL 8, MongoDB, Vue 3 webview, Docker — changing these is a major architectural decision
- **Runtime:** Server must remain compatible with alt:V resource packaging (`scripts/compile.js`, Sucrase path)
- **Persistence:** Gameplay state expectations are tied to current MySQL schema and migrations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MySQL for custom gameplay, Mongo for Rebar | Clear separation of Rebar core vs GTA-specific relational data | ✓ Good |
| Monolithic plugin entry with many commands in `server/index.ts` | Fast feature delivery; central registration | ⚠️ Revisit if file becomes unmaintainable |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-04-06 after v1.0 milestone completion_
