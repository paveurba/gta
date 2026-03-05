# Rebar Integration + QA Report

Date: 2026-03-05
Branch: rebar-rewrite

## Rebar Framework Integration

Completed:

- Replaced custom scaffold with official Rebar framework repository layout.
- Added gameplay plugin at:
  - `src/plugins/[gameplay]/gta-mysql-core`
- Plugin architecture includes:
  - `server/modules`
  - `server/services`
  - `server/repositories`
  - `server/database`

MySQL-only behavior for gameplay logic:

- Added centralized pooled MySQL service (`mysql2/promise`).
- All plugin DB access is repository-driven.
- Rebar core startup MongoDB initialization is disabled in `src/main/server/startup.ts`.

## Runtime Validation

Executed:

1. `pnpm install`
2. `pnpm binaries`
3. `pnpm build:docker`
4. `docker compose up --build -d`
5. `docker compose ps`
6. `docker compose logs --tail=200 altv-server`
7. `docker compose exec -T mysql ... SHOW TABLES;`

Observed:

- Containers healthy:
  - `gta-rebar-mysql` up/healthy
  - `gta-rebar-server` up
- Server startup logs show Rebar resource loading and plugin loading phase.
- MySQL schema initialized successfully with tables:
  - `users`
  - `player_vehicles`
  - `inventory_items`
  - `player_jobs`

## Remaining QA Gaps

- Full gameplay functional verification requires an alt:V client session:
  - `/register`
  - `/login`
  - spawn confirmation
  - `/veh`, `/inv`, `/job`

## Notes

- Root `pnpm exec tsc --noEmit` reports baseline upstream Rebar type issues outside this plugin; plugin build pipeline (`pnpm build:docker`) still completes and resources are generated.
