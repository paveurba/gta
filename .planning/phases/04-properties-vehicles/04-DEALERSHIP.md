# Phase 04 — Dealerships and catalog

Maps **VEH-03** to `VehicleService` constants and server/client flow.

## Catalog

- Source: `VEHICLE_CATALOG` in `VehicleService.ts` — **45** entries across categories (Compacts, Sedans, Sports, Super, Muscle, SUVs, Motorcycles, Off-Road).
- `vehicle:getCatalog` → server emits `vehicle:catalog` with the full array (no auth gate in handler).

## Purchase RPC

- Client: `vehicle:buy(model, modelHash, price)` — `price` is ignored server-side (kept for RPC compatibility).
- Server: `buyVehicle(session.oderId, model, modelHash, price, session.money)`.
- **Trust model:** `VehicleService.resolveCatalogVehicle` requires `model` (trimmed, lowercased) **and** `modelHash` to match the **same** `VEHICLE_CATALOG` row. Purchase **always** charges **`catalogItem.price`** and persists **`catalogItem.model`** / **`catalogItem.hash`**. Mismatch → failure before any money or row mutation.

## `VEHICLE_DEALERSHIPS` (exact coordinates from source)

| name | x | y | z |
|------|---|---|---|
| Premium Deluxe Motorsport | -56.49 | -1097.25 | 26.42 |
| Simeon's Dealership | -31.66 | -1106.95 | 26.42 |

## Chat `/dealership`

`handleCommand` `dealership` case (logged-in): teleports to **Premium Deluxe Motorsport** coords above — matches `VEHICLE_DEALERSHIPS[0]`.

## Client

`client/index.ts`: dealership proximity + **E** opens dealership UI (`dealershipMenuOpen` / catalog from `vehicle:catalog`); purchase selection emits `vehicle:buy`. Not the Vue webview.

There is **no** chat command to buy a catalog vehicle by name; ownership purchases go through the **in-world dealership menu** (or future RPC from other UI).
