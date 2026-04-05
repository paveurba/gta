---
phase: 05-shops-casino
plan: 01
subsystem: combat-economy
tags: altv, weapons, player_weapons, ammu

requires: []
provides:
  - 05-WEAPONS-SERVER.md for WEAPON_CATALOG, weaponshop:*, gta:locations:update weapon shops
  - README weapons / Ammu alignment
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/05-shops-casino/05-WEAPONS-SERVER.md
  modified:
    - README.md

key-decisions:
  - "Unknown weapon hash fails buy; getWeaponByHash gates RPC path"

patterns-established: []

requirements-completed:
  - WPN-01
  - WPN-02

duration: retro
completed: 2026-04-06
---

# Phase 5: Plan 05-01 Summary

**Weapon shops, catalog, native E-key buy path, ammo top-up, and `player_weapons` load/save hooks are documented end-to-end.**

## Performance

- **Tasks:** 3 (per plan)
- **Files:** reference doc + README + client/server touchpoints documented

## Accomplishments

- `05-WEAPONS-SERVER.md` maps `WeaponShopService`, `PlayerWeaponService`, RPCs, chat `/weapons` `/buyweapon`, and login/death/logout call sites.

## Deviations from Plan

None (retroactive summary).

## Task commits

N/A — retroactive backfill (Phase 8).

## Files created / modified

- `05-WEAPONS-SERVER.md` — WPN-01, WPN-02
- `README.md`
