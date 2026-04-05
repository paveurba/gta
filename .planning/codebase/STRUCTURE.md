# Structure

**Analysis Date:** 2026-04-05

## Repository layout

| Path | Role |
|------|------|
| `src/plugins/gta-mysql-core/` | Main gameplay plugin (server, client, services, repos, DB). |
| `src/main/` | Rebar framework code: `server/`, `client/`, `shared/` (types, data, utilities). |
| `webview/` | Vue 3 app: `src/`, `composables/`, `pages/`, Vite config. |
| `scripts/` | `compile.js`, `buildPluginImports.js`, `pathResolver.js`, `upgrade.js`, etc. |
| `database/init/` | SQL seed / schema (`001_schema.sql`) for MySQL container. |
| `resources/core/` | **Build output** — compiled JS + `resource.toml` (generated; not hand-edited). |
| `Dockerfile`, `docker-compose.yml` | Server image and local stack. |
| `.env.example` | Documented environment variables. |

## Plugin internals (`gta-mysql-core`)

| Path | Purpose |
|------|---------|
| `server/index.ts` | Primary server entry: pool init, services, commands, world setup. |
| `server/services/` | Domain services (`AuthService`, `VehicleService`, `CasinoService`, …) and `services/index.ts` barrel. |
| `server/repositories/` | MySQL access helpers (`user.repository.ts`, `vehicle.repository.ts`, …). |
| `server/database/` | `migrations.ts`, `config.ts`. |
| `client/index.ts` | Client entry: keys, menus, webview. |
| `package.json` | Plugin-local metadata if present. |

## Naming conventions

- **Services:** `*Service.ts` — PascalCase class per domain.
- **Repositories:** `*.repository.ts` — lowercase filename with `.repository` suffix.
- **Types:** Under `src/main/shared/types/` — grouped by domain (`vehicle.ts`, `appearance.ts`, …).

## Important files (quick reference)

- `README.md` — Features, commands, schema overview, Docker workflow.
- `package.json` (root) — Scripts: `compile:ts`, `refresh`, `build:docker`, `webview:dev`.
- `src/resource.toml` — Copied to `resources/core/` during compile.

---

_Structure analysis: 2026-04-05_
