# Phase 17 — Plan 01 summary

**Wave 1 — auth validation + AuthService + property interior tests**

## Done

- Added `src/plugins/gta-mysql-core/server/auth/authValidation.ts` with `isValidEmail` / `isValidUsername`; `AuthService` imports them (no duplicate regex helpers).
- Tests: `tests/unit/gta/authValidation.test.ts`, `authService.test.ts` (mocked `pool`, `alt-server`, `EmailService` for reset), `propertyInterior.test.ts` (`alt-server` mock for importing `PropertyService`).

## Verification

- `npx tsc --noEmit` — pass  
- `pnpm test` — pass  

_Date: 2026-04-06_
