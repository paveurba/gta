# Phase 17 — Context: GTA plugin automated test coverage (maximal Vitest)

## Scope boundary

**In scope:** `src/plugins/gta-mysql-core/**` — everything that can run in **Node + Vitest** with **mocked** `mysql2` pool and **mocked** `alt-server` where imports pull it in.

**Explicitly out of scope (document, do not pretend to “cover” in Vitest):**

- Real **alt:V** client/server runtime (natives, sync, streaming, WebView in game).
- End-to-end **multiplayer** flows (use **UAT** / manual checks; see `17-VERIFICATION.md`).

## Goal (Nyquist / GSD)

Maximize **observable** automated coverage for **business rules** and **pure helpers** so refactors to `services/`, `events/`, and `client/` are safer. “Full” here means **full within the automatable boundary**, not 100% of lines including alt:V-only paths.

## Dependencies

- **Phase 15** — Vitest scaffold (`pnpm test`, `tests/unit/gta/`).
- Existing tests: `displayTagFromEmail`, hospitals, `VehicleService.buyVehicle`, `AppearanceService` helpers, `DatabaseService`, `keyCodeFromAltKey`.

## References

- `.planning/codebase/TESTING.md`
- `vitest.config.ts`
