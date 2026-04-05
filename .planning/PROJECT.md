# GTA (alt:V Rebar server)

## What This Is

A **GTA Online–style alt:V multiplayer server** built on the **Rebar** framework: players authenticate, earn and spend money, own properties and vehicles, use a phone, visit shops and the casino, and play in a cleaned world (no ambient traffic/peds) with map blips and static parked cars. Persistence uses **MySQL** for custom gameplay data and **MongoDB** for Rebar core; **Docker Compose** is the documented way to run the stack.

## Current state (shipped)

- **v1.0** completed **2026-04-06** (GSD phases 1–6, 18 plans, 34 v1 requirements). Archives: [`.planning/milestones/v1.0-ROADMAP.md`](.planning/milestones/v1.0-ROADMAP.md), [`.planning/milestones/v1.0-REQUIREMENTS.md`](.planning/milestones/v1.0-REQUIREMENTS.md). Git tag: **`v1.0`**.
- **v1.1 gap closure** completed **2026-04-06** (phases 7–9 — GSD verification retrofit, retro plan summaries, server catalog/garage trust + WEBV wording). Archives: [`.planning/milestones/v1.1-ROADMAP.md`](.planning/milestones/v1.1-ROADMAP.md), [`.planning/milestones/v1.1-REQUIREMENTS.md`](.planning/milestones/v1.1-REQUIREMENTS.md). Summary: [`.planning/MILESTONES.md`](.planning/MILESTONES.md). Git tag: **`v1.1`**.

## Next milestone goals (candidates)

**No active roadmap** until **`$gsd-new-milestone`**. Likely themes from [`.planning/codebase/CONCERNS.md`](codebase/CONCERNS.md) and v2 backlog: **TEST-01**, **TEST-02**, **MAIL-01**, owning **`vehicle:spawn`** ownership if desired, modularizing `server/index.ts`, optional Nyquist **`VALIDATION.md`** files.

## Core Value

Players can **join the server, persist a character economy (cash/bank), and use the documented gameplay loops** (auth, money, housing, vehicles, weapons, clothing, phone, casino, world markers) **reliably against MySQL-backed state**.

## Requirements

### Validated

- ✓ **alt:V + Rebar server** runs with compiled `resources/core` — v1.0
- ✓ **MySQL persistence** for players, money, weapons, clothes, vehicles, properties, phone, casino, transaction log — v1.0
- ✓ **MongoDB** for Rebar core — v1.0
- ✓ **Authentication** — Auth UI (**T**) — v1.0
- ✓ **Money** — cash and bank — v1.0
- ✓ **Phone** — contacts and SMS — v1.0
- ✓ **Properties & vehicles** — full loop + dealership — v1.0; **catalog-priced `buyVehicle`** + **garage spawn guards** — v1.1
- ✓ **Weapon & clothing shops** + **casino** — v1.0
- ✓ **World UX** — blips, static vehicles, hospital respawn, population off — v1.0
- ✓ **Vue webview** builds to `resources/webview`; core HUDs **native**; **WEBV-01** wording aligned in archive — v1.0 + v1.1
- ✓ **Docker workflow** — v1.0
- ✓ **GSD verification artifacts** — `VERIFICATION.md` per phase dir 01–06 — v1.1
- ✓ **GSD retro summaries** — `NN-MM-SUMMARY.md` for phases 4–6 plans — v1.1

### Active

- [ ] **Next milestone scope** — define via `$gsd-new-milestone`
- [ ] Keep **documentation and planning** aligned as the repo evolves
- [ ] Address **technical debt** in CONCERNS when prioritized

### Out of Scope

- **Single-player or non–alt:V** GTA V modes — different product surface
- **Official Rockstar GTA Online** backend compatibility — not a goal

## Context

- Brownfield codebase: primary plugin `src/plugins/gta-mysql-core/` with long `server/index.ts` orchestration and dedicated **services**.
- See `.planning/codebase/ARCHITECTURE.md` and `STACK.md` for structure and dependencies.
- Public feature reference: root `README.md`.

## Constraints

- **Tech stack:** alt:V, Rebar, TypeScript, MySQL 8, MongoDB, Vue 3 webview, Docker
- **Runtime:** alt:V resource packaging (`scripts/compile.js`, Sucrase path)
- **Persistence:** Current MySQL schema and migrations

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MySQL for custom gameplay, Mongo for Rebar | Separation of concerns | ✓ Good |
| Monolithic `server/index.ts` | Fast delivery | ⚠️ Revisit if unmaintainable |
| Server-authoritative vehicle catalog on buy | Close INT-02 / exploitation risk | ✓ Good — v1.1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (`$gsd-complete-milestone`): full section review; update Current state, Validated, and Next goals.

---

_Last updated: 2026-04-06 after **v1.1** milestone completion (`$gsd-complete-milestone`)._
