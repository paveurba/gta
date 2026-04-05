# Phase 04 — Vehicles core (persistence, spawn, debug)

Maps **VEH-01**, **VEH-02**, **VEH-04**, **VEH-05** to `VehicleService` and chat/RPC; `vehicle:*` client handlers live in `server/events/registerVehicleClientEvents.ts` (wired from `index.ts`).

## `player_vehicles` / `PlayerVehicle`

Fields used in code (from `VehicleService.ts` interface): `id`, `player_id`, `model`, `model_hash`, `color_primary`, `color_secondary`, `garage_property_id`, `pos_x`, `pos_y`, `pos_z`, `rot_x`, `rot_y`, `rot_z`, **`is_spawned`**, `purchased_at`.

## `buyVehicle`

- Inserts row: `INSERT INTO player_vehicles (player_id, model, model_hash, color_primary, color_secondary)`.
- Deducts `players.money`; `INSERT transaction_logs` type `vehicle_purchase`.
- Returns `vehicleId` for follow-up spawn.

## `spawnVehicle(player, vehicleId, x, y, z, headingDegrees?)`

- **Heading** is degrees; converted with `heading * (Math.PI / 180)` for `alt.Vehicle` rotation.
- Sets plate `GTA{id}`; `UPDATE player_vehicles SET is_spawned = TRUE`, world pos, `garage_property_id = NULL`.

## Client RPCs

| Event | Notes |
|--------|--------|
| `vehicle:getMyVehicles` | Session → `getPlayerVehicles(oderId)` → `vehicle:myVehicles`. |
| `vehicle:spawn` | `spawnVehicle(player, vehicleId, pos.x+3, pos.y, pos.z, headingDeg)` with `headingDeg = rot.z * (180/π)`. |
| `vehicle:sell` | `sellVehicle`; requires vehicle not spawned (must store first). |

Post-**purchase** auto-spawn in `vehicle:buy` must call `spawnVehicle` with **`player` first**, same heading convention as `vehicle:spawn`.

## Chat (`handleCommand`)

| Command | Behavior |
|---------|----------|
| `/myvehicles` | Requires login. Lists `getPlayerVehicles(session.oderId)` with id, model, status (`Spawned` / `In Garage` / `Stored`). |
| `/spawnvehicle <id>` | Same spawn as RPC: offset +3 on X from player, heading from rotation. |
| `/car <model>` | **Temporary debug:** `new alt.Vehicle(model, ...)` near player — **not** persisted to MySQL. Default model `sultan` if omitted. Requires login. |

## Catalog / buy

Dealership catalog and `vehicle:buy` are documented in `04-DEALERSHIP.md` (**VEH-03**).
