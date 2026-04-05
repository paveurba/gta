---
phase: 06-world-webview
plan: 01
subsystem: world
tags: altv, blips, parked-vehicles

requires: []
provides:
  - 06-BLIPS-AND-STATIC.md for createMapBlips, BLIP_SPRITES, property:list refresh, PARKED_VEHICLE_SPAWNS
  - README map / world feature alignment
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/06-world-webview/06-BLIPS-AND-STATIC.md
  modified:
    - README.md

key-decisions:
  - "Document Pillbox blip vs HOSPITAL_SPAWNS coordinate split"

patterns-established: []

requirements-completed:
  - WORLD-01
  - WORLD-02

duration: retro
completed: 2026-04-06
---

# Phase 6: Plan 06-01 Summary

**Map blips for shops, properties, hospitals, casino, dealerships and 46 static parked spawns are documented with data sources.**

## Performance

- **Tasks:** 3
- **Files:** `06-BLIPS-AND-STATIC.md` + README

## Accomplishments

- `gta:locations:update` + `property:list` → client `createMapBlips()` pipeline captured.
- `spawnStaticParkedVehicles` behavior (engine off, unlocked) noted.

## Deviations from Plan

None (retroactive summary).

## Task commits

N/A — retroactive backfill (Phase 8).

## Files created / modified

- `06-BLIPS-AND-STATIC.md` — WORLD-01, WORLD-02
- `README.md`
