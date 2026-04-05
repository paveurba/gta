# Phase 15 — Test scaffold (TEST-01)

**Gathered:** 2026-04-05  
**Status:** Ready for execution (**15-01** planned)

## Phase boundary

Deliver a **minimal automated test setup** in the repo root (or agreed subfolder) so critical **pure** server utilities can be regression-tested **without** spinning alt:V or MySQL.

This phase does **not** require integration tests, webview tests, or full service-layer coverage.

## Decisions (locked for 15-01)

- **Runner:** **Vitest** — fast, ESM-friendly, common for TS projects; aligns with existing **`typescript`** dev stack.
- **Scope:** Tests only for **pure functions** (deterministic in/out, no `alt`, no `mysql2` pool). First target: **`displayTagFromEmail`** in **`src/plugins/gta-mysql-core/server/constants/syncedMetaKeys.ts`**.
- **Layout:** Test files under repo-root **`tests/`** (not **`src/`**) so **`pnpm compile:ts`** (Sucrase) does not copy specs into **`resources/core`**.
- **CI:** **Shipped with 15-01** — **`ci.yml`** runs **`pnpm test`** after **`compile:ts`** (extends **TEST-02** gate).

## Non-goals

- Mocking alt:V or Rebar APIs.
- DB fixtures or migration tests.
- Client (alt-client) tests.

## Canonical references

- [`.planning/REQUIREMENTS.md`](../../REQUIREMENTS.md) — **TEST-01** (v2 backlog summary).
- [`src/plugins/gta-mysql-core/server/constants/syncedMetaKeys.ts`](../../../src/plugins/gta-mysql-core/server/constants/syncedMetaKeys.ts) — first test target.
- [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) — optional follow-up for **`pnpm test`**.

## Verification

- **`pnpm test`** exits **0**.
- **`pnpm run compile:ts`** still exits **0** (no regression).
