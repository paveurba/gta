# GTA alt:V Rebar Rewrite (TypeScript + MySQL + Docker)

Clean rewrite of the project using a Rebar-style plugin architecture. Legacy code is intentionally removed and not migrated.

## Stack

- alt:V multiplayer server
- TypeScript
- Rebar-style modular runtime and plugin registration
- MySQL 8 with pooled access (`mysql2/promise`)
- Docker / Docker Compose

## Project Structure

- `main/server` server bootstrap and runtime
- `main/client` client entrypoint
- `main/shared` shared event contracts / types
- `plugins` gameplay modules (`authentication`, `player-management`, `vehicles`, `inventory`, `jobs`)
- `main/server/services` centralized services including database pool
- `main/server/repositories` repository layer for all DB access
- `database/init` MySQL schema initialization scripts
- `resources/rebar` alt:V resource metadata

## Architecture

- Centralized `DatabaseService` owns MySQL connection pooling.
- Repositories are the only DB-call layer.
- Services hold business logic.
- Plugins register gameplay features and command handlers.
- No raw SQL calls are scattered through modules.

## Implemented Example Features

- Player registration: `/register <email> <password>`
- Player login: `/login <email> <password>`
- Spawn after login/register
- Vehicle spawn command: `/veh <model>`
- Inventory preview command: `/inv`
- Jobs command: `/job <name>` and `/job`

## Environment

1. Copy env file:

```bash
cp .env.example .env
```

2. Adjust values as needed:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`

## Run with Docker

```bash
docker compose up --build -d
```

## Build Locally (optional)

```bash
npm install
npm run typecheck
npm run build
```

## Database Schema

The MySQL schema is auto-initialized from:

- `database/init/001_schema.sql`

This includes:

- `users`
- `player_vehicles`
- `inventory_items`
- `player_jobs`
