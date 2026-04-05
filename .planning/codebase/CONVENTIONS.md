# Conventions

**Analysis Date:** 2026-04-05

## Code style

- **Formatter:** Prettier (root `package.json`: single quotes, semicolons, tab width 4, print width 120, Tailwind plugin).
- **Language:** TypeScript with explicit types in services; `import * as alt from 'alt-server'` / `alt-client` as needed.
- **Modules:** ESM (`"type": "module"` in root `package.json`).

## Organization

- **Barrel export:** `src/plugins/gta-mysql-core/server/services/index.ts` re-exports services and constants for `server/index.ts`.
- **Large entry file:** `server/index.ts` combines initialization, command tables, and world configuration — new features often add a service + wiring in this file.

## Patterns

- **MySQL:** Prefer parameterized queries via `mysql2` pool; services receive `Pool` in constructor.
- **Player binding:** Session state stored in maps keyed by `alt.Player` or player id (see `PlayerSession` in `server/index.ts`).
- **Chat commands:** String dispatch from registered chat handlers to service methods.
- **Locations / catalogs:** Static arrays imported from `services/index.ts` exports (`WEAPON_CATALOG`, `VEHICLE_DEALERSHIPS`, etc.).

## Error handling

- **Logging:** `alt.log('[gta-mysql-core] ...')` for diagnostics.
- **User feedback:** Chat messages for command errors; avoid throwing uncaught exceptions on hot paths where possible.

## Comments

- Section banners (`// =====`) used in `server/index.ts` to separate MySQL, session, commands, world features.

---

_Conventions analysis: 2026-04-05_
