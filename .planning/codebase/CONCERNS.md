# Concerns

**Analysis Date:** 2026-04-06

## Test coverage

- **Partial mitigation (v1.2):** **GitHub Actions** runs **`pnpm run compile:ts`** on push/PR to **`main`** (**TEST-02**). No unit/integration test suite yet (**TEST-01** backlog).
- **Risk:** Gameplay and DB logic can still regress without automated tests; compile-only CI catches TS/transpile breaks.

## Operational

- **Orchestration file:** `src/plugins/gta-mysql-core/server/index.ts` is **~220** lines after phase **11** (**11-04**). Merge risk is lower; large data arrays live in **`world/spawnStaticParkedVehicles.ts`**.
- **Docker / arch:** README notes possible `linux/amd64` emulation on ARM Macs — performance and debugging overhead.

## Security

- **Secrets:** Mail and DB credentials belong in env only (never commit `.env`). Planning docs must not paste real keys.
- **Auth:** Password hashing uses bcrypt; ensure rounds and transport (game protocol) match your threat model.
- **SQL:** Services should continue using parameterized queries to avoid injection.

## Data

- **Dual databases:** MySQL (custom) + MongoDB (Rebar) — operators must understand which system owns which data to avoid inconsistent backups or restores.

## Dependencies

- **alt:V + Rebar versions:** Locked via project tooling (`rebar:upgrade`, `altv-pkg`); upgrades may require coordinated type and API changes.

---

_Concerns analysis: 2026-04-06_
