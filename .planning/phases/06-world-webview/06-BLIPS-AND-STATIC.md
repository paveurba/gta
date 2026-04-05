# Phase 06 — Map blips and static parked vehicles

Maps **WORLD-01** and **WORLD-02** to `gta-mysql-core` client/server code.

## Blip pipeline

`createMapBlips()` in `client/index.ts` clears `createdBlips`, then recreates one blip per POI. Sprites are defined in **`BLIP_SPRITES`**:

| Category | Sprite | Colour | Short range | Data source |
|----------|--------|--------|-------------|-------------|
| Weapon shops | 110 (gun) | 1 red | yes | `weaponShops` from **`gta:locations:update`** |
| Clothing shops | 73 (shirt) | 3 blue | yes | `clothingShops` from **`gta:locations:update`** |
| Casino | 679 (chip) | 46 gold | **no** (always visible) | `casinos` from **`gta:locations:update`** |
| Property for sale | 374 | 2 green | yes | **`property:list`** → `properties`; `owner_player_id === null` |
| Property owned | 40 | 3 blue | yes | Same list; `owner_player_id !== null` (label “(Owned)”) — **no** per-player grey blip; all owned show blue |
| Hospitals | 61 | 49 pink | yes | Client constant **`HOSPITALS`** (map-facing coords) |
| Dealerships | 225 | 5 yellow | yes | Client constant **`VEHICLE_DEALERSHIPS`** (matches server catalog coords) |

### Server → client

On **`playerConnect`** (`registerPlayerLifecycleEvents`, wired from `server/index.ts`):

1. **`gta:locations:update`** with `WEAPON_SHOP_LOCATIONS`, `CLOTHING_SHOP_LOCATIONS`, `CASINO_LOCATIONS`.
2. **`property:list`** with `getAllProperties()` for blips + markers.

After buy/sell property, **`broadcastPropertyUpdate`** re-emits `property:list` to all players → `createMapBlips()` runs again on each client.

## Hospitals: map blip vs respawn

| Purpose | Source | Pillbox Hill example |
|---------|--------|----------------------|
| **Map blip** | `HOSPITALS` in `client/index.ts` | `340.25, -580.59, 28.82` |
| **Death respawn** | `HOSPITAL_SPAWNS` in `registerPlayerLifecycleEvents.ts` | `307.32, -595.38, 43.29` (street-level spawn) |

Other three hospitals use the **same** x,y,z between client blip list and server spawn table. Pillbox differs so the icon sits near the medical plaza while the player spawns at configured street coords.

## Static parked vehicles (**WORLD-02**)

- Array **`PARKED_VEHICLE_SPAWNS`** in **`server/world/spawnStaticParkedVehicles.ts`** — **46** entries `{ x, y, z, heading, model }`; **`spawnStaticParkedVehicles()`** called from **`server/index.ts`** at startup.
- **`spawnStaticParkedVehicles()`** (called at plugin load after `init`): destroys previous `spawnedParkedVehicles`, spawns each with `new alt.Vehicle(model, pos, rot)` where rotation z = `heading * (π/180)`, **`engineOn = false`**, **`lockState = 1`** (unlocked). Failures log a warning per model.

## Property menu vs blip

World markers / interaction use separate logic from blip colours; see client `drawPropertyMarkers` and `PROPERTY_INTERACTION_RADIUS`.
