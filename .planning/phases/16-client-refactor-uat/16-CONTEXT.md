# Phase 16 — Client refactor game verification (UAT)

**Goal:** Prove **in alt:V** that **`gta-mysql-core`** client behavior matches expectations after **Phase 14** modularization and the **property-menu / `nearbyProperty` fix** in **`draw.ts`**.

## Why

- **Compile + Vitest** do not exercise **HUD**, **keyup**, **cursor**, or **multiplayer**.
- A structured **checklist** makes regressions visible and gives a place to record **PASS / FAIL / skip** with notes.

## Non-goals

- Full regression of every v1.0 phase (use this checklist as a **smoke** layer; deep dives stay in older **VERIFICATION.md** files if needed).
- Automated alt:V UI tests (no runner in repo today).

## Artifacts

- **`16-UAT-CHECKLIST.md`** — steps to run in-game.
- **`16-VERIFICATION.md`** — fill after each run (date, build, results).
- **`16-01-PLAN.md`** — executable plan referencing the checklist.

## Success

- **`16-VERIFICATION.md`** completed for at least one **local or staging** run with **no unexpected FAIL** on **blocker** rows (auth, **T**, property edge, chat).
