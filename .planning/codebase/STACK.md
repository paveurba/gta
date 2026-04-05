# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**

- **TypeScript** (~5.5) — Server plugin (`src/plugins/gta-mysql-core/`), Rebar `src/main/` tree, build scripts under `scripts/`.

**Secondary:**

- **Vue 3** — In-game webview UI under `webview/` (Vite + Tailwind).
- **SQL** — MySQL schema in `database/init/001_schema.sql`.

## Runtime

**Environment:**

- **Node.js** (20.x-class; `@types/node` ^20) — alt:V server process; `altv-server` after compile.
- **alt:V** — GTA V multiplayer runtime (server + client resources).

**Package Manager:**

- **pnpm** — Root and `webview/package.json`; lockfiles as present in repo.

## Frameworks

**Core:**

- **Rebar** — Plugin architecture; `@Server`, `@Shared` imports from compiled `resources/core`.
- **alt:V** — `alt-server`, `alt-client` APIs via `@altv/types-*`.

**Build / dev:**

- **Sucrase** — Fast TS transpile (`pnpm compile:ts`) to `resources/core`.
- **Vite** (^5.4) — Webview bundling (`webview/`).
- **Docker Compose** — Local stack: `altv-server`, MySQL 8, MongoDB 7 (`docker-compose.yml`).

## Key Dependencies

**Critical:**

- `mysql2` — Connection pool, migrations, all persistence in `gta-mysql-core` services.
- `mongodb` — Rebar core character / DB integration (`MONGODB` env).
- `bcryptjs` — Password hashing for auth (`AuthService`).
- `hono` + `@hono/node-server` — HTTP layer where used by Rebar/tooling.
- `dotenv` — Local and container env loading.

**Game / UI:**

- `vue`, `vite`, `@vitejs/plugin-vue` — Webview pages and composables under `webview/`.

## Configuration

**Environment:**

- `.env` from `.env.example` — `DB_*`, `MONGODB`, `GAME_PORT`, optional `MAIL_*` for email (`docker-compose.yml` passes these into `altv-server`).

**Build:**

- `tsconfig.json` — Project TypeScript settings.
- `scripts/compile.js` — Full compile path (local vs Docker).
- `webview/vite.config.ts`, `tailwind.config.js`, `postcss.config.js` — UI build.

## Platform Requirements

**Development:**

- Docker recommended for MySQL + MongoDB + server (`pnpm refresh` after code changes).
- Apple Silicon: image may be `linux/amd64` under emulation (noted in `README.md`).

**Production:**

- Containerized alt:V server with reachable game port (default **7788** TCP/UDP).
- MySQL 8 and MongoDB available to the server process.

---

_Stack analysis: 2026-04-05_
_Update after major dependency changes_
