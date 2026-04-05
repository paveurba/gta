---
phase: 06-world-webview
plan: 02
subsystem: world
tags: altv, death, respawn, population

requires: []
provides:
  - 06-DEATH-AND-WORLD.md for playerDeath, 5000 ms delay, HOSPITAL_FEE, gta:spawn:safe
  - Ambient population natives (everyTick + connectionComplete)
  - README death/fee wording
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/06-world-webview/06-DEATH-AND-WORLD.md
  modified:
    - README.md

key-decisions:
  - "Hospital respawn omits coords on gta:spawn:safe to avoid roof probe; client death UI fee string matches server constant"

patterns-established: []

requirements-completed:
  - WORLD-03
  - WORLD-04

duration: retro
completed: 2026-04-06
---

# Phase 6: Plan 06-02 Summary

**Death → nearest hospital, 5s delay, $500 fee persistence, weapon reload after respawn, and ambient population suppression are documented.**

## Performance

- **Tasks:** 3
- **Files:** `06-DEATH-AND-WORLD.md` + README

## Accomplishments

- Quoted `HOSPITAL_FEE`, `5000` ms, and native density multipliers by name.
- `playersInProperty.delete` on death path noted.

## Deviations from Plan

None (retroactive summary).

## Task commits

N/A — retroactive backfill (Phase 8).

## Files created / modified

- `06-DEATH-AND-WORLD.md` — WORLD-03, WORLD-04
- `README.md`
