---
phase: 02-identity-economy
plan: 03
subsystem: economy
tags: mysql, persistence

requires: []
provides:
  - Documented `savePlayerMoney` SQL and call sites
  - README Money section MySQL persistence sentence (from 02-01 README edit)
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "refreshPlayerMoney exists but has no call sites in repo — noted for future cleanup or use"

patterns-established: []

requirements-completed:
  - ECON-01
  - ECON-02

duration: 15min
completed: 2026-04-05
---

# Phase 2: Plan 02-03 Summary

**Money persistence is traced to `UPDATE players SET money = ?, bank = ? WHERE email = ?` and disconnect/respawn/givemoney paths; in-game UAT left for operators.**

## Money persistence

**SQL** (from `savePlayerMoney` in `src/plugins/gta-mysql-core/server/index.ts`):

`UPDATE players SET money = ?, bank = ? WHERE email = ?`

**Call sites (savePlayerMoney):**

1. **`playerDisconnect`** handler (~line 331) — persists session cash/bank when the player leaves.
2. **`playerDeath` / respawn** path (~line 417) — after hospital fee deduction when the player has enough cash.
3. **`handleCommand` → `givemoney`** (~line 983) — debug command after mutating `session.money`.

**`refreshPlayerMoney`:** Defined (~line 141) with `SELECT money, bank FROM players WHERE id = ?`; **no call sites** found elsewhere in `src/` (possible dead code or reserved for future use).

## Manual UAT (operator)

**Skipped in agent execution** — requires alt:V client + running server.

1. Start stack (`docker compose up -d` per README).
2. Connect with alt:V client; press **T**; register and log in via Auth UI.
3. Run `/money` — note cash and bank.
4. Run `/givemoney 500`; run `/money` again — balances should update.
5. Disconnect and reconnect; log in again; run `/money` — values should match MySQL `players` row for that account.

## Deviations from Plan

- None for documentation scope; live UAT not run by agent.

## Self-Check: PASSED

- `server/index.ts` contains `UPDATE players SET money = ?, bank = ? WHERE email = ?`
- This SUMMARY contains that SQL string
- `README.md` Money section references `players` table / MySQL (via prior edit: "**`players`** table in MySQL**")
- This file includes `/givemoney` and `/money` and heading `## Manual UAT (operator)`
