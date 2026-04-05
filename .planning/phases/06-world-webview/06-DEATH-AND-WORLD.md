# Phase 06 — Death, respawn, and ambient population

Maps **WORLD-03** and **WORLD-04**.

## Death / hospital respawn (`server/index.ts`)

Handler: **`alt.on('playerDeath', ...)`**.

1. Resolves **`getNearestHospital(deathPos)`** over **`HOSPITAL_SPAWNS`** (4 entries: Pillbox, Mount Zonah, Sandy Shores, Paleto).
2. **`alt.setTimeout(..., 5000)`** — **5 seconds** before respawn.
3. **`player.spawn(spawnX, spawnY, spawnZ, spawnHeading)`**; health **200**, armour **0**.
4. **`HOSPITAL_FEE` = 500**: if session exists and `session.money >= 500`, deduct fee, **`savePlayerMoney`**, **`syncMoneyToClient`**; else notify no fee (insufficient funds).
5. Logged-in: **`applyCharacterLook`** then **`weaponService.loadWeaponsToPlayer`**.
6. **`playersInProperty.delete(player.id)`**.
7. **`alt.emitClient(player, 'gta:spawn:safe')`** — **no coordinates** so the client does not run ground probe (avoids clinic roof mis-spawn; see server comment).

Notify on death: `You died! Respawning in 5 seconds...`

## Client death UI (`client/index.ts`)

- **`alt.on('playerDeath')`**: sets **`isDead = true`**, **`deathTime = Date.now()`**.
- **`RESPAWN_DELAY = 5000`** — **`drawDeathScreen()`** shows WASTED, countdown, and **“Hospital fee: $500”** (hardcoded string; matches server **`HOSPITAL_FEE`**).
- **`gta:spawn:safe`**: **`isDead = false`**; if x,y,z passed (login spawn), **`forceSafeGroundSpawn`**; if no args (hospital respawn), only clears death state.

## Ambient population (**WORLD-04**)

### Every frame

**`alt.everyTick`** calls **`disableAmbientPopulation()`**:

- `setVehicleDensityMultiplierThisFrame(0.0)`
- `setRandomVehicleDensityMultiplierThisFrame(0.0)`
- `setParkedVehicleDensityMultiplierThisFrame(0.0)`
- `setPedDensityMultiplierThisFrame(0.0)`
- `setScenarioPedDensityMultiplierThisFrame(0.0, 0.0)`
- `setGarbageTrucks(false)`, `setRandomBoats(false)`, `setRandomTrains(false)`

### Once on connect

**`connectionComplete`**: **`disablePopulationOnce()`** — ped/vehicle population budget **0**, random events off, random cops off, **`enableDispatchService(1..6, false)`**.

Also: **`alt.loadDefaultIpls()`**, **`loadCasinoInterior()`**, collision request at casino coords.

Together this keeps traffic/peds/dispatch minimal for a GTA Online–style session.
