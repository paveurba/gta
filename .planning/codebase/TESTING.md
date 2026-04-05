# Testing

**Analysis Date:** 2026-04-06

## Automated tests

- **Unit / integration:** No `*.test.ts`, `*.spec.ts`, or Jest/Vitest config observed in the repository root or `webview/` at analysis time (**TEST-01** backlog).
- **CI:** **`.github/workflows/ci.yml`** runs **`pnpm run compile:ts`** on **push** and **pull_request** to **`main`** (**TEST-02**). Install uses **`--ignore-scripts`** (root **`postinstall`** is not CI-safe).

## Manual verification

- **Local server:** `docker compose up` / `pnpm refresh` per `README.md`; connect alt:V client to `localhost:7788`.
- **Logs:** `docker compose logs -f altv-server` for runtime errors.
- **Email:** Optional SMTP env vars; `sendTestEmail` path exists under services for mail checks.

## Recommended practices (for future work)

- Add **Vitest** or **Node test runner** for pure functions in `shared` utilities and repository SQL builders (with test DB or mocks).
- **Smoke script:** Post-deploy check for MySQL connectivity and migration version.

---

_Testing analysis: 2026-04-06_
