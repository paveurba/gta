# GTA V alt:V Server - Rebar Rewrite with MySQL

This project is a clean rewrite based on the official Rebar framework source, with gameplay logic implemented as a Rebar plugin and MySQL-backed repositories/services.

## Stack

- alt:V server
- Rebar framework (official layout and startup)
- TypeScript
- MySQL 8 (`mysql2` with pooling)
- Docker / Docker Compose

## Plugin Architecture

Gameplay plugin location:

- `src/plugins/[gameplay]/gta-mysql-core`

Server plugin layout:

- `server/modules`
  - `authentication`
  - `player-management`
  - `vehicles`
  - `inventory`
  - `jobs`
- `server/services`
- `server/repositories`
- `server/database`

All database access goes through:

- `DatabaseService` (centralized pool)
- repository/service pattern (no scattered raw SQL)

## Implemented Features

- `/register <email> <password>`
- `/login <email> <password>`
- Spawn on successful login/register
- `/veh <model>`
- `/inv`
- `/job <name>` and `/job`

## In-Game Testing Without Chat

If chat input is unavailable in your client build, use fallback hotkeys:

- `F5`: quick register (`dev<playerId>@local.test` / `pass1234`)
- `F6`: quick login for the same dev account
- `F7`: spawn `sultan`
- `F8`: show inventory
- `F9`: set/get `taxi` job

These are temporary QA helpers in the gameplay plugin.

## Database Schema

MySQL init script:

- `database/init/001_schema.sql`

Tables:

- `users`
- `player_vehicles`
- `inventory_items`
- `player_jobs`

## Run with Docker

1. Create env file:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up --build -d
```

3. View server logs:

```bash
docker compose logs -f altv-server
```

## Notes

- Rebar upstream defaults to MongoDB in core startup. This rewrite disables that startup DB init and uses MySQL in the gameplay plugin as requested.
