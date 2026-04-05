<!-- GSD:project-start source:PROJECT.md -->
## Project

**GTA (alt:V Rebar server)**

A **GTA Online–style alt:V multiplayer server** built on the **Rebar** framework: players authenticate, earn and spend money, own properties and vehicles, use a phone, visit shops and the casino, and play in a cleaned world (no ambient traffic/peds) with map blips and static parked cars. Persistence uses **MySQL** for custom gameplay data and **MongoDB** for Rebar core; **Docker Compose** is the documented way to run the stack.

**Core Value:** Players can **join the server, persist a character economy (cash/bank), and use the documented gameplay loops** (auth, money, housing, vehicles, weapons, clothing, phone, casino, world markers) **reliably against MySQL-backed state**.

### Constraints

- **Tech stack:** alt:V, Rebar, TypeScript, MySQL 8, MongoDB, Vue 3 webview, Docker — changing these is a major architectural decision
- **Runtime:** Server must remain compatible with alt:V resource packaging (`scripts/compile.js`, Sucrase path)
- **Persistence:** Gameplay state expectations are tied to current MySQL schema and migrations
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- **TypeScript** (~5.5) — Server plugin (`src/plugins/gta-mysql-core/`), Rebar `src/main/` tree, build scripts under `scripts/`.
- **Vue 3** — In-game webview UI under `webview/` (Vite + Tailwind).
- **SQL** — MySQL schema in `database/init/001_schema.sql`.
## Runtime
- **Node.js** (20.x-class; `@types/node` ^20) — alt:V server process; `altv-server` after compile.
- **alt:V** — GTA V multiplayer runtime (server + client resources).
- **pnpm** — Root and `webview/package.json`; lockfiles as present in repo.
## Frameworks
- **Rebar** — Plugin architecture; `@Server`, `@Shared` imports from compiled `resources/core`.
- **alt:V** — `alt-server`, `alt-client` APIs via `@altv/types-*`.
- **Sucrase** — Fast TS transpile (`pnpm compile:ts`) to `resources/core`.
- **Vite** (^5.4) — Webview bundling (`webview/`).
- **Docker Compose** — Local stack: `altv-server`, MySQL 8, MongoDB 7 (`docker-compose.yml`).
## Key Dependencies
- `mysql2` — Connection pool, migrations, all persistence in `gta-mysql-core` services.
- `mongodb` — Rebar core character / DB integration (`MONGODB` env).
- `bcryptjs` — Password hashing for auth (`AuthService`).
- `hono` + `@hono/node-server` — HTTP layer where used by Rebar/tooling.
- `dotenv` — Local and container env loading.
- `vue`, `vite`, `@vitejs/plugin-vue` — Webview pages and composables under `webview/`.
## Configuration
- `.env` from `.env.example` — `DB_*`, `MONGODB`, `GAME_PORT`, optional `MAIL_*` for email (`docker-compose.yml` passes these into `altv-server`).
- `tsconfig.json` — Project TypeScript settings.
- `scripts/compile.js` — Full compile path (local vs Docker).
- `webview/vite.config.ts`, `tailwind.config.js`, `postcss.config.js` — UI build.
## Platform Requirements
- Docker recommended for MySQL + MongoDB + server (`pnpm refresh` after code changes).
- Apple Silicon: image may be `linux/amd64` under emulation (noted in `README.md`).
- Containerized alt:V server with reachable game port (default **7788** TCP/UDP).
- MySQL 8 and MongoDB available to the server process.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Code style
- **Formatter:** Prettier (root `package.json`: single quotes, semicolons, tab width 4, print width 120, Tailwind plugin).
- **Language:** TypeScript with explicit types in services; `import * as alt from 'alt-server'` / `alt-client` as needed.
- **Modules:** ESM (`"type": "module"` in root `package.json`).
## Organization
- **Barrel export:** `src/plugins/gta-mysql-core/server/services/index.ts` re-exports services and constants for `server/index.ts`.
- **Large entry file:** `server/index.ts` combines initialization, command tables, and world configuration — new features often add a service + wiring in this file.
## Patterns
- **MySQL:** Prefer parameterized queries via `mysql2` pool; services receive `Pool` in constructor.
- **Player binding:** Session state stored in maps keyed by `alt.Player` or player id (see `PlayerSession` in `server/index.ts`).
- **Chat commands:** String dispatch from registered chat handlers to service methods.
- **Locations / catalogs:** Static arrays imported from `services/index.ts` exports (`WEAPON_CATALOG`, `VEHICLE_DEALERSHIPS`, etc.).
## Error handling
- **Logging:** `alt.log('[gta-mysql-core] ...')` for diagnostics.
- **User feedback:** Chat messages for command errors; avoid throwing uncaught exceptions on hot paths where possible.
## Comments
- Section banners (`// =====`) used in `server/index.ts` to separate MySQL, session, commands, world features.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single primary gameplay plugin: `gta-mysql-core` (server + client entrypoints).
- **Procedural registration** — Chat commands, keybinds, interactions, and blips wired in `server/index.ts` and `client/index.ts`.
- **Stateless game logic per request** with **persistent state in MySQL** (pool-per-process).
## Layers
- **Purpose:** alt:V lifecycle, player sessions, command routing, business operations.
- **Contains:** `index.ts` (orchestration), `services/*.ts` (domain logic), `repositories/*.ts` (data access helpers), `database/migrations.ts`.
- **Depends on:** `mysql2`, Rebar (`useRebar()`), `alt-server`.
- **Used by:** alt:V server runtime when resource starts.
- **Purpose:** Input, menus, markers, webview toggles, synced UI state.
- **Contains:** `client/index.ts`.
- **Depends on:** `alt-client`, Rebar client APIs, webview events.
- **Purpose:** Framework types, utilities, shared data (clothing catalogs, blips, etc.) consumed by plugins after compile.
- **Purpose:** Vue 3 SPA for phone, HUD-related pages, composables (`useMessenger`, `usePlayerStats`, etc.).
- **Built:** Vite; output consumed by server resource packaging (`scripts/compile.js` Docker path includes webview build).
## Data Flow
- Money, weapons, vehicles, properties — each has a dedicated service (`PlayerWeaponService`, `VehicleService`, `PropertyService`, etc.) called from command handlers and interaction callbacks in `server/index.ts`.
- **Durable:** MySQL tables (see `README.md` schema summary and `database/init/001_schema.sql`).
- **Ephemeral:** In-memory maps for sessions, cooldowns, and runtime markers on `alt.Player`.
## Key abstractions
- **Purpose:** Encapsulate one domain (e.g. `CasinoService`, `PhoneService`).
- **Examples:** `src/plugins/gta-mysql-core/server/services/PropertyService.ts`, `VehicleService.ts`, `AuthService.ts`.
- **Pattern:** Constructed once after pool creation in `getMySQLPool()`.
- **Purpose:** SQL-focused helpers (user, vehicle, inventory, job).
- **Examples:** `src/plugins/gta-mysql-core/server/repositories/user.repository.ts`, `vehicle.repository.ts`.
- **Purpose:** Versioned schema changes on startup.
- **Location:** `src/plugins/gta-mysql-core/server/database/migrations.ts`.
## Entry points
- `src/plugins/gta-mysql-core/server/index.ts` — registers alt:V events, commands, tick handlers, and initializes MySQL after `getMySQLPool()`.
- `src/plugins/gta-mysql-core/client/index.ts` — key handlers, webview, world interaction.
- `scripts/compile.js` — Orchestrates TS + webview for local or Docker builds (`package.json` scripts `start`, `build:docker`, `refresh`).
## Error handling
- **Strategy:** Log via `alt.log`; many paths use try/catch around async DB work and user-facing chat errors.
- **Pattern:** Failures in DB migrations or pool init are critical-path (logged; server behavior depends on surrounding guards).
## Cross-cutting concerns
- Email/password via `AuthService`, bcrypt rounds from `BCRYPT_ROUNDS` env.
- Blips, static vehicles, shop locations — configured as data + registration blocks in `server/index.ts` (see imports of `WEAPON_SHOP_LOCATIONS`, `CASINO_LOCATIONS`, etc.).
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
