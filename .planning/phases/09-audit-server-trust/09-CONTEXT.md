# Phase 9: Server trust & WEBV wording — Context

**Gathered:** 2026-04-06  
**Status:** Ready for execution  
**Source:** [v1.0 audit](../v1.0-MILESTONE-AUDIT.md) integration gaps **INT-01**–**INT-03**; [`.planning/ROADMAP.md`](../ROADMAP.md) Phase 9

## Phase boundary

1. **INT-02 / AUD-TRUST-01:** Server is authoritative for dealership purchase — `buyVehicle` must resolve the vehicle against `VEHICLE_CATALOG`, reject tampered `model` / `modelHash` / `price`, and charge the **catalog** price (not the client-supplied price).
2. **INT-03 / AUD-TRUST-02:** `vehicle:spawnFromGarage` must confirm the session player **owns the property** and that the **vehicle row** belongs to the player and is **stored in that garage** (`garage_property_id`) before calling `spawnVehicle`.
3. **INT-01 / AUD-DOC-01:** Align archived **WEBV-01** text and any remaining docs so “phone / core HUD = native client” vs “Vue webview = Rebar shell” is unambiguous. README and `06-WEBVIEW.md` are already mostly correct; adjust **`.planning/milestones/v1.0-REQUIREMENTS.md`** and light cross-links as needed.

**Out of scope:** Nyquist `VALIDATION.md`; adding a full automated test framework (no Vitest/Jest in repo today). Use **manual verification** steps recorded under phase 4 **VERIFICATION.md** (and optionally this phase after execute).

## Canonical references

- `src/plugins/gta-mysql-core/server/services/VehicleService.ts` — `VEHICLE_CATALOG`, `buyVehicle`, `getVehicleById`, `spawnVehicle`
- `src/plugins/gta-mysql-core/server/index.ts` — `vehicle:buy`, `vehicle:spawnFromGarage` (and compare with `vehicle:store` ownership pattern)
- `.planning/phases/04-properties-vehicles/04-DEALERSHIP.md`, `04-GARAGE.md`, `VERIFICATION.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md` — **WEBV-01** line under Webview
- `README.md` — Webview (Vue) section
- `.planning/phases/06-world-webview/06-WEBVIEW.md`

## Deferred / follow-ups

- **`vehicle:spawn` (world spawn)** does not currently assert `player_id` on the row before `spawnVehicle` — symmetric trust issue. Not in roadmap Phase 9; capture in `.planning/codebase/CONCERNS.md` if not already implied.

---

*Phase: 09-audit-server-trust*
