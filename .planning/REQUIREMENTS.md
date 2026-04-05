# Requirements: GTA (alt:V Rebar server)

**Active milestone:** **v1.2 — quality & correctness** (see [ROADMAP](ROADMAP.md)).

## Shipped baselines

| Milestone | Scope | Archive |
|-----------|--------|---------|
| **v1.0** | 34 gameplay / ops requirements (phases 1–6) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) |
| **v1.1** | 5 audit gap-closure IDs (AUD-VERIFY-01 … AUD-DOC-01) | [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md) |

## v1.2 — Quality & correctness

| ID | Description |
|----|-------------|
| **PROP-INT-01** | Property **enter**: no server-side `player.pos` to IPL interior coords; client teleports from `property:enterResult`. **Exit**: client-only exterior teleport. Chat `enter` validates interior like RPC. |
| **REFACTOR-01** | Extract **`vehicle:*`** and **`property:*`** client RPC wiring from `server/index.ts` into **`register*ClientEvents`** with typed context (**11-01**, **11-02**). No speculative abstractions. |
| **REFACTOR-02** | Extract remaining server wiring: **`playerConnect` / `Disconnect` / `Death`**, **`auth:*`**, chat + **`handleChatCommand`**, phone, weapon/clothing/casino shop RPCs; shared **`PlayerSession`** (**11-03**). No behavior change. |
| **REFACTOR-03** | Extract **`index.ts`** remainder: MySQL pool + service construction (**`createGameplayMysqlBundle`**), player/session helpers (**`createPlayerRuntime`**), static parked vehicles (**`spawnStaticParkedVehicles`**). No behavior change (**11-04**). |
| **TEST-02** | **GitHub Actions** **`ci.yml`**: **`pnpm run compile:ts`** and **`pnpm test`** (Vitest) on **push** and **pull_request** to **`main`**. Install uses **`--ignore-scripts`** because root **`postinstall`** runs **`altv-pkg`** / **`build:docker`** (not CI-safe). **Lint** in CI deferred (no shared eslint script; Prettier optional follow-up). |
| **TEST-01** | **Unit tests:** **Vitest**, **`pnpm test`**, tests under **`tests/`** (kept out of **`src/`** so Sucrase output unchanged). First coverage: **`displayTagFromEmail`** (**`syncedMetaKeys`**). More pure helpers / services later. |
| **UI-NAMETAG-01** | **Player nametags:** server sets synced meta **`gta:displayName`** (email **`@`** prefix, same idea as chat); clears on session clear, auth logout, **`/logout`**. Client draws label above **`streamedIn`** others within **~22 m** via **`getScreenCoordFromWorldCoord`**. |
| **REFACTOR-CLIENT-01** | Split **`gta-mysql-core/client/index.ts`** into **`client/*.ts`** modules (**`clientState`**, domain **`*Client.ts`**, **`draw.ts`**, **`hudClient.ts`**, **`inputClient.ts`**). Thin **`index.ts`** imports only. No gameplay change (**14-01**). |

### Checklist (v1.2)

- [x] **PROP-INT-01**
- [x] **REFACTOR-01**
- [x] **REFACTOR-02**
- [x] **REFACTOR-03**
- [x] **TEST-02**
- [x] **UI-NAMETAG-01**
- [x] **REFACTOR-CLIENT-01**
- [x] **TEST-01**

## Traceability (v1.2)

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROP-INT-01 | 10 | Complete |
| REFACTOR-01 | 11 | Complete _(11-01, 11-02 — vehicle + property registrars)_ |
| REFACTOR-02 | 11 | Complete _(11-03 — lifecycle, auth, chat commands, shops, phone, casino)_ |
| REFACTOR-03 | 11 | Complete _(11-04 — bootstrap, player runtime, parked world spawns)_ |
| TEST-02 | 12 | Complete _(12-01 — CI compile; **15-01** adds **`pnpm test`** to same workflow)_ |
| UI-NAMETAG-01 | 13 | Complete _(13-01 — synced meta + client draw)_ |
| REFACTOR-CLIENT-01 | 14 | Complete _(14-01 — client modules + thin index)_ |
| TEST-01 | 15 | Complete _(15-01 — Vitest + **`displayTagFromEmail`** + CI test step)_ |

## v2 backlog (reference)

| ID | Theme | Summary |
|----|--------|---------|
| MAIL-01 | Email | Optional SMTP-based verification or notifications in production |

## Out of scope (reference)

| Feature | Reason |
|---------|--------|
| Native mobile client | Web + alt:V client only |
| Rockstar official Online sync | Independent server |
| Real-money gambling | Gameplay currency only |

---

_Updated: 2026-04-05 — **v1.2** active; phases **10**–**15** complete (**15-01** Vitest + **TEST-01** scaffold)._
