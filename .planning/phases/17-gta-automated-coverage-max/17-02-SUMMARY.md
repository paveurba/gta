# Phase 17 — Plan 02 summary

**Wave 2 — property transactions + coverage reporting + docs**

## Done

- `tests/unit/gta/propertyService.transactions.test.ts` — `buyProperty` / `sellProperty` branches (not found, owned, funds, success; sell wrong owner / success).
- Dev dependency `@vitest/coverage-v8`; `vitest.config.ts` `coverage.provider: 'v8'`, `coverage.include: ['src/plugins/gta-mysql-core/**/*.ts']`; script `pnpm test:coverage`.
- `.planning/codebase/TESTING.md` updated for Vitest layout and automatable vs alt:V gap.

## Verification

- `pnpm test:coverage` — pass (coverage is **instrumentation** of the plugin tree; overall % stays low until more services gain tests).

_Date: 2026-04-06_
