# Phase 05 — Clothing (server reference)

Maps **CLTH-01**, **CLTH-02** to `ClothingShopService` and `clothingshop:*` in `src/plugins/gta-mysql-core/server/events/registerClothingShopClientEvents.ts` (wired from `server/index.ts`).

## Catalog (`CLOTHING_CATALOG`)

Each item: `component`, `drawable`, `texture`, `name`, `price`. Components align with **`CLOTHING_COMPONENTS`** (e.g. `TOPS: 11`, `LEGS: 4`, `FEET: 6`, `ACCESSORIES: 8`).

## Shop locations (`CLOTHING_SHOP_LOCATIONS`)

Sent to client as `clothingShops` in **`gta:locations:update`**. **Blue** blips; **E** opens native clothing menu.

| x | y | z | name |
|---|----|---|------|
| 72.30 | -1398.90 | 29.37 | Suburban |
| -163.10 | -302.70 | 39.73 | Ponsonbys |
| -1192.60 | -768.30 | 17.32 | Binco |
| 425.70 | -806.20 | 29.49 | Discount Store |
| -708.20 | -152.30 | 37.42 | Ponsonbys |
| -1193.90 | -766.90 | 17.32 | Suburban |
| 127.00 | -223.20 | 54.56 | Suburban |
| 617.30 | 2759.60 | 42.09 | Discount Store |

## RPCs

| Event | Behavior |
|--------|-----------|
| `clothingshop:getCatalog` | Emits `clothingshop:catalog` with `CLOTHING_CATALOG`. |
| `clothingshop:preview` | `previewClothing` → `player.setClothes(component, drawable, texture, 0)` (no charge). |
| `clothingshop:buy` | Session required → `buyClothing(player, oderId, component, drawable, texture, money)`. |

## `buyClothing` pricing (verbatim fallback)

```typescript
const item = CLOTHING_CATALOG.find(
    c => c.component === component && c.drawable === drawable && c.texture === texture
);
const price = item?.price || 100; // Default price if not in catalog
```

Trusted tuple `(component, drawable, texture)` from client: if not in catalog, player still pays **$100** and row is saved.

## Persistence (`player_clothes`)

`saveClothing`: `INSERT ... ON DUPLICATE KEY UPDATE` on `(player_id, component)` per migration unique key.

`loadPlayerClothing`: reads all rows for `player_id`, applies `setClothes` for each.

## When outfit is applied

**`applyCharacterLook`** (`server/index.ts`): `appearanceService.loadOrCreateDefaultAppearance` + Rebar appearance apply, then **`loadPlayerClothing`**. Used from **`completeLogin`** and **hospital respawn** (`registerPlayerLifecycleEvents`) after death.

**`/sex`**: after model change, calls `loadPlayerClothing` again.

## Client

Native menu in `client/index.ts` near clothing blips; purchase emits **`clothingshop:buy`**. No chat command for catalog purchase.
