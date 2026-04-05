# Phase 05 — Weapons (server reference)

Maps **WPN-01**, **WPN-02** to `WeaponShopService`, `PlayerWeaponService`, and `weaponshop:*` handlers in `src/plugins/gta-mysql-core/server/events/registerWeaponShopClientEvents.ts` (wired from `server/index.ts`).

## Catalog

- **`WEAPON_CATALOG`** (`WeaponShopService.ts`): entries with `name`, `hash`, `price`, `ammo`, `category` — categories include `pistol`, `smg`, `rifle`, `shotgun`, `sniper`, `melee`, `armor` (Body Armor uses `hash: 0`).
- **`weaponshop:getCatalog`** → server emits **`weaponshop:catalog`** with the full array (no session check in handler).

## Buy paths

### RPC `weaponshop:buy(weaponHash)`

- Requires login; `WeaponShopService.buyWeapon(player, session.oderId, weaponHash, session.money)`.
- **`getWeaponByHash`**: unknown hash → `{ success: false, message: 'Weapon not found' }` (unlike vehicle buy, price/hash are not free-form from client for unknown weapons).
- Deducts `weapon.price` from `players.money`; `INSERT transaction_logs` as `WEAPON_BUY`.
- Non-armor: `player.giveWeapon` + `PlayerWeaponService.saveWeapon` → **`player_weapons`** upsert.
- Armor (`category === 'armor'`): sets `player.armour = 100` only (no `player_weapons` row for hash 0).

### Chat `/buyweapon <name>`

- Joins args to name, finds `WEAPON_CATALOG` by case-insensitive name, calls same `buyWeapon` with `weapon.hash`.

### Ammo `weaponshop:buyAmmo(weaponHash, amount)`

- **$2 per round** (`pricePerBullet`); requires player to already hold that weapon (`player.weapons`).
- Updates ammo via `giveWeapon` + `saveWeapon` (same `ON DUPLICATE KEY UPDATE` path).

## Persistence (`PlayerWeaponService` / `player_weapons`)

| Method | Role |
|--------|------|
| `saveWeapon` | `INSERT ... ON DUPLICATE KEY UPDATE ammo` for `(player_id, weapon_hash)`. |
| `getPlayerWeapons` | Load all rows for `player_id`. |
| `loadWeaponsToPlayer` | On login and after hospital respawn: `giveWeapon` for each saved row. |
| `savePlayerWeapons` | On logout, `clearExistingSession`, and disconnect handler: iterates `player.weapons`, `INSERT IGNORE` with ammo **100** placeholder (does not overwrite DB ammo). |
| `removeWeapon` / `clearPlayerWeapons` | Delete row(s). |

**Call sites (`index.ts`):**

- **`completeLogin`**: `loadWeaponsToPlayer` after `applyCharacterLook`.
- **`applyCharacterLook`**: appearance then `loadPlayerClothing` (weapons loaded separately in `completeLogin`).
- **`playerDeath` / respawn**: `loadWeaponsToPlayer` after `applyCharacterLook`.
- **`clearExistingSession`**, disconnect, `/logout`: `savePlayerWeapons`.

## Shop locations (`WEAPON_SHOP_LOCATIONS`)

Pushed to clients in **`gta:locations:update`** as `weaponShops` (see `index.ts` ~313). Client draws **red** blips and opens native menu with **E**.

| x | y | z | name |
|---|----|---|------|
| 19.80 | -1106.90 | 29.80 | Ammu-Nation |
| -661.90 | -933.50 | 21.83 | Ammu-Nation |
| 811.20 | -2159.40 | 29.62 | Ammu-Nation |
| 1692.80 | 3761.40 | 34.71 | Ammu-Nation |
| -330.70 | 6085.20 | 31.45 | Ammu-Nation |
| 2569.30 | 292.40 | 108.73 | Ammu-Nation |

## Chat discovery

- **`/weapons`**: prints hint and first 5 catalog names (full list via in-game shop catalog RPC).

## Client

`src/plugins/gta-mysql-core/client/index.ts`: weapon shops from `gta:locations:update`; **E** when near → `weaponshop:getCatalog`, menu → `weaponshop:buy` with selected **hash**. **Not** the Vue webview.
