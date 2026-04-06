# Testing

**Analysis date:** 2026-04-06 (updated Phase 17)

## Automated tests (Vitest)

- **Runner:** **Vitest** — `pnpm test` (all `tests/**/*.test.ts`), `pnpm test:gta` (GTA unit folder only).
- **Coverage:** `pnpm test:coverage` uses **`@vitest/coverage-v8`** with **`coverage.include`** limited to **`src/plugins/gta-mysql-core/**/*.ts`** so the report targets the gameplay plugin, not all of Rebar `src/main`.
- **Location:** **`tests/unit/gta/`** — pure logic and **mocked** `mysql2` / **`alt-server`** (see per-file `vi.mock('alt-server', …)` where the module under test imports alt:V).
- **CI:** **`.github/workflows/ci.yml`** runs **`pnpm run compile:ts`** and **`pnpm test`** on push/PR to **`main`** (**TEST-02** + **TEST-01**). Install uses **`--ignore-scripts`** (root **`postinstall`** is not CI-safe).

### Phase 17 additions

- **`server/auth/authValidation.ts`** — `isValidEmail` / `isValidUsername` (used by **`AuthService`**).
- **Auth / property:** `authValidation.test.ts`, `authService.test.ts`, `propertyInterior.test.ts`, `propertyService.transactions.test.ts`.

“Full” automated coverage of the whole server is **not** a goal: **`server/index.ts`**, client scripts, webview, and alt:V sync still need **manual / in-game UAT**.

## Manual verification

- **Local server:** `docker compose up` / `pnpm refresh` per `README.md`; connect alt:V client to `localhost:7788`.
- **Logs:** `docker compose logs -f altv-server` for runtime errors.
- **Email:** Optional SMTP env vars; `sendTestEmail` path exists under services for mail checks.

## Recommended practices (for future work)

- Extend Vitest with more **service** tests using **mocked** `pool.execute` (same pattern as **`VehicleService`**, **`PropertyService`**, **`AuthService`**).
- **Smoke script:** Post-deploy check for MySQL connectivity and migration version.

---

_Testing analysis: 2026-04-06; Phase 17 coverage tooling and GTA-focused unit tests documented._
