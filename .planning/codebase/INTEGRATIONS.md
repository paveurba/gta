# Integrations

**Analysis Date:** 2026-04-05

## Databases

**MySQL 8**

- **Role:** Primary persistence for GTA custom gameplay: players, money, weapons, clothes, vehicles, properties, phone, casino, transactions.
- **Access:** `mysql2/promise` pool in `src/plugins/gta-mysql-core/server/index.ts` (`getMySQLPool`), configured via `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- **Schema / migrations:** `database/init/001_schema.sql` for initial container bootstrap; `src/plugins/gta-mysql-core/server/database/migrations.ts` runs incremental migrations on pool init.

**MongoDB 7**

- **Role:** Rebar framework core (character documents and Rebar-managed data), not the custom MySQL game tables.
- **Connection:** `MONGODB` connection string (e.g. `mongodb://mongodb:27017` in Compose).

## Email

- **Libraries:** `nodemailer` — used by `src/plugins/gta-mysql-core/server/services/EmailService.ts` and `mailTransport.ts`.
- **Configuration:** `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` (optional; empty disables sending in typical setups).

## alt:V / Rebar

- **alt:V server** — Host process; loads compiled resources from `resources/core` after `scripts/compile.js` / Sucrase pipeline.
- **Rebar APIs** — `useRebar()` database, messenger, and other services from `@Server/index.js` in `src/plugins/gta-mysql-core/server/index.ts`.

## Client ↔ Server

- **Events / RPC** — Custom plugin registers alt:V server and client handlers in `src/plugins/gta-mysql-core/server/index.ts` and `src/plugins/gta-mysql-core/client/index.ts`.
- **Webview** — Vue UI communicates via Rebar webview bridge (see `src/main/shared/webview/` and `webview/composables/`).

## External HTTP APIs

- No third-party SaaS APIs are required for core loop; optional email SMTP is the main outbound integration.

---

_Integrations analysis: 2026-04-05_
