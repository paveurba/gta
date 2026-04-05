# Concerns

**Analysis Date:** 2026-04-05

## Test coverage

- **Gap:** No automated test suite detected; regressions rely on manual playtesting and compile-time checks.
- **Risk:** Database and service changes can break gameplay flows without immediate signal.

## Operational

- **Large orchestration file:** `src/plugins/gta-mysql-core/server/index.ts` is very long (1000+ lines), which increases merge conflict risk and makes navigation harder.
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

_Concerns analysis: 2026-04-05_
