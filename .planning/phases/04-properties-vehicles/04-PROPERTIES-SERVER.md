# Phase 04 — Properties (server reference)

Maps **PROP-01**–**PROP-04** to `PropertyService` and `property:*` handlers in `src/plugins/gta-mysql-core/server/events/registerPropertyClientEvents.ts` (wired from `server/index.ts`).

## `PropertyService` (`PropertyService.ts`)

| Method | Purpose |
|--------|---------|
| `getAllProperties` | `SELECT * FROM properties` (all rows, ordered by price). |
| `getAvailableProperties` | `SELECT * FROM properties WHERE owner_player_id IS NULL` (for-sale only). |
| `getPlayerProperties` | `SELECT *` where `owner_player_id = ?`. |
| `getPropertyById` | Single property by `id`. |
| `getPropertyAtPosition` | Nearest property within radius (default 5m) of world coords. |
| `getNearestProperty` | Closest property globally with distance. |
| `buyProperty` | Validates unowned + funds; `UPDATE properties SET owner_player_id`, deducts `players.money`, `INSERT transaction_logs`. |
| `sellProperty` | Owner only; 70% sell price; clears `owner_player_id` / `purchased_at`; credits money + log. |
| `canEnterProperty` | True if row exists and `owner_player_id === playerId`. |
| `isPropertyAvailable` | True if unowned. |

## Client RPCs (`alt.onClient`)

All require login where noted; session uses `session.oderId` (MySQL player id).

| Event | Guard | Service / behavior | Client result event |
|--------|--------|---------------------|---------------------|
| `property:buy` | Session | `buyProperty(oderId, propertyId, money)` | `property:buyResult`; on success updates session money, `syncMoneyToClient`, `broadcastPropertyUpdate` |
| `property:sell` | Session | `sellProperty` | `property:sellResult`; same money sync |
| `property:enter` | Session | Load property; owner check; `buildPropertyInteriorEnterPayload` (valid `interior_*`); **`playersInProperty.set`** only — **no** `player.pos` on server (client teleports after IPL/collision; server-side interior pos caused wrong world sync / exterior snap) | `property:enterResult` + `interior` payload (`heading`, `ipl`) |
| `property:exit` | — | `playersInProperty.get`; load property; map delete; **no** server `player.pos` (client `property:exitResult` teleports to door) | `property:exitResult` + `exterior` |

Also: `property:getList` / `property:requestList` → `getAllProperties` → `property:list` (full list for blips/UI).

## Chat commands (`handleCommand`)

| Command | Session | Backend |
|---------|---------|---------|
| `properties` | No | `getAvailableProperties()` — lists **for-sale** only (`#id name: $price`). |
| `myproperties` | Yes | `getPlayerProperties(session.oderId)` — **owned** only. |
| `buyproperty <id>` | Yes | `buyProperty` + money sync + broadcast. |
| `sellproperty <id>` | Yes | `sellProperty` + money sync + broadcast. |
| `enter` | Yes | Same validation as RPC via `buildPropertyInteriorEnterPayload`; `playersInProperty`; `property:enterResult` (client teleport). |
| `exit` | — | Uses `playersInProperty`; `property:exitResult` (client teleport). |

## `playersInProperty`

`Map<alt.Player id, propertyId>` — tracks who is “inside” for **exit** and server cleanup on disconnect (`playersInProperty.delete`).

## Money and SQL

- Buy/sell: `UPDATE players SET money = ?` and `INSERT INTO transaction_logs` via `PropertyService.logTransaction` (`PROPERTY_BUY` / `PROPERTY_SELL` with signed amounts as implemented).

## Client wiring

Native property UI lives in `src/plugins/gta-mysql-core/client/index.ts`: **E** opens `openPropertyMenu()` when near a property; actions emit `property:buy`, `property:enter`, `property:exit`, `property:sell`.

**Server:** `property:*` `alt.onClient` handlers are registered in `src/plugins/gta-mysql-core/server/events/registerPropertyClientEvents.ts` (called from `server/index.ts`).
