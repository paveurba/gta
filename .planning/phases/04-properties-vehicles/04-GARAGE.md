# Phase 04 — Garage (server reference)

Maps **PROP-05** to `VehicleService` garage methods and `vehicle:*` handlers in `index.ts`.

## Slot limit (verbatim behavior)

`VehicleService.storeVehicle` loads the row, checks ownership, then:

```typescript
const currentCount = await this.countGarageVehicles(propertyId);
if (currentCount >= garageSlots) {
    return { success: false, message: `Garage is full (${garageSlots} slots)` };
}
```

`countGarageVehicles` counts rows in `player_vehicles` with `garage_property_id = ?`.

Server handlers pass `garageSlots` as `(property as any).garage_slots || 2` when missing on the row.

## `storeVehicle`

- Validates vehicle exists and `vehicle.player_id === playerId`.
- Enforces slot cap above.
- If a spawned alt:V entity exists for that DB id, destroys it and removes from `spawnedVehicles`.
- `UPDATE player_vehicles SET is_spawned = FALSE, garage_property_id = ?, pos_x/y/z = NULL`.

## `storeNearbyVehicle`

- Scans `alt.Vehicle.all` within **10m** of the player.
- For plates starting with `GTA`, parses id after prefix; loads DB row; if owned by `playerId`, calls `storeVehicle`.

## Plate format

`spawnVehicle` sets `numberPlateText = \`GTA${dbVehicle.id}\`` so nearby store can resolve ownership.

## Client RPCs

| Event | Preconditions | Behavior |
|--------|----------------|----------|
| `vehicle:store` | Session; `getPropertyById`; `property.owner_player_id === session.oderId` | `storeVehicle(..., garageSlots)`; on success emits `vehicle:garageVehicles` for that property. |
| `vehicle:storeNearby` | Same property ownership | `storeNearbyVehicle(player, ...)`; same refresh. |
| `vehicle:getGarageVehicles` | Session | `getGarageVehicles(oderId, propertyId)` → `vehicle:garageVehicles` (no ownership check in handler — client should only open garage for owned property). |
| `vehicle:spawnFromGarage` | Session; property exists | Spawns at `garage_x/y/z` or falls back to `pos_x/y/z`; `garage_heading` or 0; `spawnVehicle(player, vehicleId, ...)`; refreshes garage list. |

Property row fields: `garage_slots`, `garage_x`, `garage_y`, `garage_z`, `garage_heading` (see `properties` table / `Property` interface).

## Client

`client/index.ts`: garage submenu uses **E** for store-nearby and spawn-from-garage via `vehicle:storeNearby` and `vehicle:spawnFromGarage` while `currentGaragePropertyId` is set.
