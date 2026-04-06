# Phase 17 — Verification

## Automated (CI / local)

| Check | Command |
|-------|---------|
| Typecheck | `npx tsc --noEmit` |
| Unit tests | `pnpm test` |
| Coverage (after 17-02) | `pnpm test:coverage` — interpret as **gta-mysql-core only**, not “whole game” |

## Manual / UAT (cannot be Vitest)

- Connect **alt:V client** to server; **login**, **property E**, **shop**, **vehicle buy**, **death respawn**.
- Cross-check with gameplay docs / prior UAT checklists under `.planning/phases/16-client-refactor-uat/` if still relevant.

## Done when

- [x] All **17-01** and **17-02** `must_haves` satisfied (2026-04-06).
- [x] ROADMAP Phase 17 plans marked complete.
- [x] `STATE.md` updated (optional: `$gsd-complete-milestone` for v1.3).
