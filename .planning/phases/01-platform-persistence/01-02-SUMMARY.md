---
phase: 01-platform-persistence
plan: 02
subsystem: database
tags: mysql, migrations, docker

requires: []
provides:
  - README Database Schema lists `character_appearance` and explains init SQL + runMigrations bootstrap
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "Treat migrations.ts as authoritative for runtime DDL; 001_schema.sql as reference + container first boot"

patterns-established: []

requirements-completed:
  - OPS-02

duration: 10min
completed: 2026-04-05
---

# Phase 1: Plan 01-02 Summary

**README schema inventory matches `migrations.ts`, and the dual bootstrap path (init mount + `runMigrations`) is explicit for operators.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-05
- **Completed:** 2026-04-05
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Confirmed `getMySQLPool()` awaits `runMigrations(mysqlPool)` in `src/plugins/gta-mysql-core/server/index.ts`.
- Added missing table **`character_appearance`** to the README schema list; reordered bullets to match migration creation order where helpful.
- Clarified that `database/init/` is mounted for first-time MySQL container init while migrations run on every server start.

## Task Commits

1. **Task 1: Map init SQL vs migrations** — documented in README + this SUMMARY
2. **Task 2: Align README table list with code** — `character_appearance` added

## Files Created/Modified

- `README.md` — Database Schema section

## Decisions Made

None beyond documentation accuracy.

## Deviations from Plan

None.

## Bootstrap path

On first MySQL container start, `./database/init` is mounted at `/docker-entrypoint-initdb.d` (see `docker-compose.yml`). On every alt:V server start, `runMigrations()` in `src/plugins/gta-mysql-core/server/database/migrations.ts` runs `CREATE TABLE IF NOT EXISTS` for all game tables.

## Self-Check: PASSED

- `server/index.ts` contains `runMigrations`
- `migrations.ts` contains `CREATE TABLE IF NOT EXISTS players`
- README Database Schema bullets cover all nine tables from migrations
