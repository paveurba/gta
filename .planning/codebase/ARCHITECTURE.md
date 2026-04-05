# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Monolithic alt:V **Rebar plugin** with a **service layer** over **MySQL**, plus a **Vue webview** for in-game UI.

**Key characteristics:**

- Single primary gameplay plugin: `gta-mysql-core` (server + client entrypoints).
- **Procedural registration** — Chat commands, keybinds, interactions, and blips wired in `server/index.ts` and `client/index.ts`.
- **Stateless game logic per request** with **persistent state in MySQL** (pool-per-process).

## Layers

**Server plugin (`gta-mysql-core/server`):**

- **Purpose:** alt:V lifecycle, player sessions, command routing, business operations.
- **Contains:** `index.ts` (orchestration), `services/*.ts` (domain logic), `events/register*ClientEvents.ts` (thin `alt.onClient` registrars for property/vehicle RPCs), `repositories/*.ts` (data access helpers), `database/migrations.ts`.
- **Depends on:** `mysql2`, Rebar (`useRebar()`), `alt-server`.
- **Used by:** alt:V server runtime when resource starts.

**Client plugin (`gta-mysql-core/client`):**

- **Purpose:** Input, menus, markers, webview toggles, synced UI state.
- **Contains:** `client/index.ts`.
- **Depends on:** `alt-client`, Rebar client APIs, webview events.

**Shared / Rebar main tree (`src/main/`):**

- **Purpose:** Framework types, utilities, shared data (clothing catalogs, blips, etc.) consumed by plugins after compile.

**Webview (`webview/`):**

- **Purpose:** Vue 3 SPA for phone, HUD-related pages, composables (`useMessenger`, `usePlayerStats`, etc.).
- **Built:** Vite; output consumed by server resource packaging (`scripts/compile.js` Docker path includes webview build).

## Data Flow

**Player login / session:**

1. Player connects via alt:V client to server (`GAME_PORT`, default 7788).
2. Rebar handles character/account; plugin tracks `PlayerSession` in `server/index.ts` (in-memory session keyed by player, backed by MySQL for durable data).
3. Chat commands (`/login`, `/register`, etc.) invoke `AuthService` and related services.
4. Services read/write via `mysql2` pool (repositories where used).

**Economy / inventory flows:**

- Money, weapons, vehicles, properties — each has a dedicated service (`PlayerWeaponService`, `VehicleService`, `PropertyService`, etc.) called from command handlers and interaction callbacks in `server/index.ts`.

**State management:**

- **Durable:** MySQL tables (see `README.md` schema summary and `database/init/001_schema.sql`).
- **Ephemeral:** In-memory maps for sessions, cooldowns, and runtime markers on `alt.Player`.

## Key abstractions

**Service classes:**

- **Purpose:** Encapsulate one domain (e.g. `CasinoService`, `PhoneService`).
- **Examples:** `src/plugins/gta-mysql-core/server/services/PropertyService.ts`, `VehicleService.ts`, `AuthService.ts`.
- **Pattern:** Constructed once after pool creation in `getMySQLPool()`.

**Repositories:**

- **Purpose:** SQL-focused helpers (user, vehicle, inventory, job).
- **Examples:** `src/plugins/gta-mysql-core/server/repositories/user.repository.ts`, `vehicle.repository.ts`.

**Migrations:**

- **Purpose:** Versioned schema changes on startup.
- **Location:** `src/plugins/gta-mysql-core/server/database/migrations.ts`.

## Entry points

**Server resource:**

- `src/plugins/gta-mysql-core/server/index.ts` — registers alt:V events, commands, tick handlers, and initializes MySQL after `getMySQLPool()`.

**Client resource:**

- `src/plugins/gta-mysql-core/client/index.ts` — key handlers, webview, world interaction.

**Compile pipeline:**

- `scripts/compile.js` — Orchestrates TS + webview for local or Docker builds (`package.json` scripts `start`, `build:docker`, `refresh`).

## Error handling

- **Strategy:** Log via `alt.log`; many paths use try/catch around async DB work and user-facing chat errors.
- **Pattern:** Failures in DB migrations or pool init are critical-path (logged; server behavior depends on surrounding guards).

## Cross-cutting concerns

**Authentication:**

- Email/password via `AuthService`, bcrypt rounds from `BCRYPT_ROUNDS` env.

**World presentation:**

- Blips, static vehicles, shop locations — configured as data + registration blocks in `server/index.ts` (see imports of `WEAPON_SHOP_LOCATIONS`, `CASINO_LOCATIONS`, etc.).

---

_Architecture analysis: 2026-04-05_
_Update when major patterns change_
