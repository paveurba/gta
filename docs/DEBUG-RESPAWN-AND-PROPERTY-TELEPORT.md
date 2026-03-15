# Debug Plan: Respawn Location & Property Entry Teleport Bugs

Step-by-step implementation plan to diagnose and fix two critical issues on the alt:V roleplay server.

---

## Issue 1 — Player Respawn on Clinic Roof

**Symptom:** After death, the player sometimes respawns on the **roof of the clinic** instead of at the correct street-level hospital spawn.

**Relevant code (current behaviour — fixes applied):**

- **Server:** `src/plugins/gta-mysql-core/server/index.ts`
  - `HOSPITAL_SPAWNS` array (lines 320–325): defines x, y, z, heading per hospital.
  - `playerDeath` handler (lines 349–389): picks nearest hospital, calls `player.spawn(spawnX, spawnY, spawnZ, spawnHeading)`, then emits `gta:spawn:safe` **without coords** (fix applied — no longer triggers client ground probe on respawn).
- **Client:** `src/plugins/gta-mysql-core/client/index.ts`
  - `forceSafeGroundSpawn(x, y, z)` (lines 943–965): uses `getGroundZFor3dCoord(x, y, z + 3, ...)` with fallback and logging. Now only called for login/default spawn (when coords are provided), not for respawn.
  - **Single consolidated `gta:spawn:safe` handler** (line 968, fix applied): sets `isDead = false` always; calls `forceSafeGroundSpawn` only if coords are present. Respawn emits no coords → ground probe is skipped.

**Remaining risk:**

1. **`HOSPITAL_SPAWNS` Z values not yet verified in-game** — `player.spawn()` is now trusted directly. If any hospital Z is wrong, players will spawn at that wrong Z with no client correction. Verify all four entries in-game (Phase 3.1 still required).
2. **Ground probe still active for login** — `spawnPlayerSafe` at line 241 emits coords, so `forceSafeGroundSpawn` runs on login. `DEFAULT_SPAWN` is `425.1, -979.5, 30.7` (outdoor, safe). No action needed here.

---

## Issue 2 — Property Entry Teleports to Wrong Place (e.g. Police Dept)

**Symptom:** When entering a property, the player is teleported to an incorrect location (e.g. police department) instead of the property interior.

**Relevant code:**

- **Server:** `src/plugins/gta-mysql-core/server/index.ts`
  - `property:enter` (lines ~573–601): loads property by ID, checks ownership, sends `property:enterResult` with `interior: { x, y, z, heading, ipl }` from `property.interior_x/y/z`, etc.
  - `/enter` command (lines ~967–975): uses `getPropertyAtPosition`, then sets `player.pos` to `interior_x/y/z` and updates `playersInProperty`.
- **Client:** `src/plugins/gta-mysql-core/client/index.ts`
  - `property:enterResult` (lines ~599–621): if `result.success && result.interior`, loads IPL then teleports with `setEntityCoordsNoOffset(result.interior.x, y, z)` and sets heading.
- **Data:** Interior coordinates come from the `properties` table (`interior_x`, `interior_y`, `interior_z`). Seed/update logic in `src/plugins/gta-mysql-core/server/database/migrations.ts` (lines ~210–258). Server also has hardcoded teleports (e.g. `/dealership` to `-56.49, -1097.25, 26.42`).

**Likely causes:**

1. **Wrong interior in DB:** A property (or a manually added row) has interior coordinates pointing to police station or another location.
2. **Wrong propertyId:** Client sends a different `propertyId` than the one the player is at (e.g. list index vs id).
3. **Missing or undefined interior:** If `interior_x/y/z` are null or wrong for a property, the server sends `success: true` with null coords and the client teleports to 0,0,0 or similar. *(Note: the server already returns `success: false` for missing property/non-owner — no silent fallback exists for those cases. The risk is bad data in a valid row.)*
4. **IPL loaded but teleport is immediate:** Client loads IPL then teleports without any delay (lines 602–616) — the interior geometry may not be ready, causing the player to fall through or land at the wrong Z.
5. **Dimension/interior:** alt:V dimension or interior not set when using IPL-based interiors, so the game might not be in the correct “interior world”.

---

# Implementation Plan

## Phase 1 — Reproduce and Trace

### 1.1 Respawn (clinic roof)

1. **Reproduce consistently**
   - Die near Pillbox Hill (e.g. around 340, -580, 28) and note whether you land on roof or street.
   - Repeat near other hospitals (Mount Zonah, Sandy Shores, Paleto) to see if it’s Pillbox-only or global.
2. **Trace flow**
   - Add temporary logs (see Phase 2) and reproduce again to confirm:
     - Which hospital the server chose.
     - Exact (x, y, z) used for `player.spawn()` and for `gta:spawn:safe`.
     - On client: (x, y, z) received and the `groundZ` computed by `forceSafeGroundSpawn`.

### 1.2 Property entry (wrong teleport)

1. **Reproduce**
   - Enter **each** property (by name/id) and note which one sends you to the wrong place.
2. **Trace**
   - Log the `propertyId` and the interior (x, y, z) sent from server for that property.
   - On client, log the same values when handling `property:enterResult`.
   - Compare with known GTA V interior coords (e.g. apartment interiors ~346, -1012, -99; PD Mission Row ~425, -979, 30).

---

## Phase 2 — Logging Improvements

### 2.1 Respawn (server) — `src/plugins/gta-mysql-core/server/index.ts`

In the `playerDeath` handler, after choosing the hospital and before `alt.setTimeout`:

```ts
// After: const hospital = getNearestHospital(...)
alt.log(`[gta-mysql-core] Respawn: player ${player.id} -> ${hospital.name} at ${hospital.x}, ${hospital.y}, ${hospital.z}`);
```

Inside the `alt.setTimeout` callback, before `player.spawn`:

```ts
alt.log(`[gta-mysql-core] Respawn applying: spawn(${spawnX}, ${spawnY}, ${spawnZ}) heading=${spawnHeading}`);
```

After `player.spawn` and before `emitClient`:

```ts
alt.log(`[gta-mysql-core] Respawn done, emitting gta:spawn:safe(${spawnX}, ${spawnY}, ${spawnZ})`);
```

### 2.2 Respawn (client) — `src/plugins/gta-mysql-core/client/index.ts`

In `forceSafeGroundSpawn`, at the start:

```ts
alt.log(`[gta-client] forceSafeGroundSpawn received: ${x}, ${y}, ${z}`);
```

Inside the loop, when ground is found:

```ts
alt.log(`[gta-client] forceSafeGroundSpawn ground found: groundZ=${groundZ} (attempt ${attempt + 1})`);
```

After the loop (whether or not ground was found):

```ts
alt.log(`[gta-client] forceSafeGroundSpawn setting position: ${x}, ${y}, ${groundZ}`);
```

This will show if the client is using a roof Z (e.g. high `groundZ`) for hospital coords.

### 2.3 Property entry (server) — `src/plugins/gta-mysql-core/server/index.ts`

At the start of `property:enter` handler, after loading the property and before emitting result:

```ts
alt.log(`[gta-mysql-core] property:enter player=${player.id} propertyId=${propertyId} name=${property.name} interior=${property.interior_x}, ${property.interior_y}, ${property.interior_z}`);
```

If you add any fallback (e.g. default interior when DB has nulls), log when that path is used.

### 2.4 Property entry (client) — `src/plugins/gta-mysql-core/client/index.ts`

In `property:enterResult`, when `result.success && result.interior`:

```ts
alt.log(`[gta-client] property:enterResult teleporting to interior: ${result.interior.x}, ${result.interior.y}, ${result.interior.z} heading=${result.interior.heading}`);
```

This confirms what the client actually uses and helps spot mismatches with DB or server logs.

---

## Phase 3 — Validate Coordinates

### 3.1 Hospital spawns

1. **In-game check**
   - Use `/tp 340.25 -580.59 28.82` (Pillbox) and nearby Z values (e.g. 25, 30, 35) to see which Z is street and which is roof.
2. **Reference**
   - Pillbox Hill entrance is roughly around 340, -580, 28 (street). Roof is much higher (e.g. 40+). If your `HOSPITAL_SPAWNS` entry has too high a Z, server spawn will already be on the roof.
3. **Adjust**
   - Ensure every entry in `HOSPITAL_SPAWNS` uses a Z that is **street level** (verified in-game or from a reliable source). Do not rely on client ground probe alone for hospitals if the probe is known to hit roofs.

### 3.2 Property interiors

1. **DB check**
   - Run:  
     `SELECT id, name, interior_x, interior_y, interior_z FROM properties;`
   - Compare with known GTA V coords:
     - High-end apartment interior: e.g. 346.99, -1012.99, -99.20
     - Mission Row PD: ~425, -979, 30 (example; do not use for apartments)
   - Fix any row that has interior_x/y/z pointing to PD or another wrong location.
2. **IPL**
   - Ensure `ipl` matches the interior (e.g. apa_v_mp_h_01_a … apa_v_mp_h_05_a for the seeded apartments). Wrong IPL + correct coords can still look wrong if the interior doesn’t load.

---

## Phase 4 — Debug Dimension / Interior (Property)

1. **alt:V dimensions**
   - If your server uses `player.dimension`, ensure it’s set when entering a property and reset when exiting (e.g. 0 = world, propertyId or similar for interiors). Check both:
     - `property:enter` / `property:exit` server-side.
     - Any client logic that might change dimension.
2. **IPL load order**
   - Client loads IPL in `property:enterResult` then teleports. If the interior is IPL-based, request the IPL and add a short delay (e.g. 100–200 ms) before teleporting so the interior is ready.
3. **Interior ID (optional)**
   - If you use `getInteriorAtCoords` / `refreshInterior`, ensure the interior at (interior_x, interior_y, interior_z) is the one you expect and that it’s active when the player is teleported.

---

## Phase 5 — Safe Fixes

### 5.1 Respawn (avoid clinic roof)

**Option A — Trust server Z, skip client ground correction for respawn**

- In the `playerDeath` handler, after `player.spawn(spawnX, spawnY, spawnZ, spawnHeading)` do **not** emit `gta:spawn:safe` with coordinates (so the client does not run `forceSafeGroundSpawn` and overwrite position). You can still emit `gta:spawn:safe` with no args so the client sets `isDead = false`.
- Ensure `HOSPITAL_SPAWNS` Z values are verified street-level so `player.spawn()` is correct on its own.

**Option B — Keep client correction but fix the probe**

- In `forceSafeGroundSpawn`, for known hospital positions (e.g. Pillbox 340, -580), use a **fixed street Z** instead of calling `getGroundZFor3dCoord` (e.g. 28.0 for Pillbox), so the roof is never chosen.
- Alternatively, probe from **below** (e.g. z - 5) or use a small offset that’s clearly on the street, and clamp the result so it never goes above a max Z (e.g. 35 for Pillbox).

**Option C — Single handler for gta:spawn:safe**

- You currently have two client handlers for `gta:spawn:safe`. Consolidate to one: if (x,y,z) are provided, call `forceSafeGroundSpawn(x,y,z)` then set `isDead = false`; otherwise only set `isDead = false`. This avoids any ambiguity in order of execution.

**Recommendation:** Fix `HOSPITAL_SPAWNS` Z in code and optionally in a small config, then apply Option A or B. Prefer Option A if server coords are reliable to avoid client overriding good server spawn.

### 5.2 Property entry (correct interior)

1. **Fix data**
   - Update any `properties` row whose interior_x/y/z point to PD or wrong place. Set to the correct apartment/interior coords and correct `ipl` if needed.
2. **Correct propertyId**
   - Ensure the client sends the real `property.id` when entering (e.g. from the property list or from the marker you’re interacting with), not an index or another id.
3. **No silent fallback** *(already implemented — no action needed)*
   - `server/index.ts:580–586` already returns `success: false` for missing property and non-owner. The risk is only bad `interior_x/y/z` data in an otherwise valid DB row, which sends `success: true` with wrong coords.
4. **IPL + delay**
   - When `result.interior.ipl` is present, request IPL then delay the teleport by 100–200 ms so the interior is loaded before moving the player.

---

## Phase 6 — Example Code Structure (Respawn)

**Server — only emit “clear death” after spawn, no coords (Option A):**

```ts
// In playerDeath handler, after player.spawn(...) and health/armour/money/weapons:
playersInProperty.delete(player.id);
// Option A: do not send coords; client only clears death state
alt.emitClient(player, 'gta:spawn:safe');
```

**Client — single handler, optional ground correction:**

```ts
alt.onServer('gta:spawn:safe', (x?: number, y?: number, z?: number) => {
    isDead = false;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
        forceSafeGroundSpawn(x, y, z).catch(() => {});
    }
});
```

If you keep client-side ground correction, add a “known spawn” list so hospital positions use fixed Z instead of `getGroundZFor3dCoord` (Option B).

---

## Phase 7 — Example Code Structure (Property Entry)

**Server — validate and log before sending:**

```ts
alt.onClient('property:enter', async (player, propertyId: number) => {
    // ... existing session/ownership checks ...
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
        alt.emitClient(player, 'property:enterResult', { success: false, message: 'Property not found' });
        return;
    }
    if (property.owner_player_id !== session.oderId) {
        alt.emitClient(player, 'property:enterResult', { success: false, message: 'You do not own this property' });
        return;
    }
    // Optional: sanity check interior (e.g. interior_z < 0 for apartment interiors)
    const interior = {
        x: property.interior_x,
        y: property.interior_y,
        z: property.interior_z,
        heading: property.interior_heading || 0,
        ipl: property.ipl || undefined
    };
    alt.log(`[gta-mysql-core] property:enter player=${player.id} propertyId=${propertyId} name=${property.name} interior=${interior.x}, ${interior.y}, ${interior.z}`);
    playersInProperty.set(player.id, propertyId);
    alt.emitClient(player, 'property:enterResult', { success: true, message: `Entered ${property.name}`, interior });
});
```

**Client — optional delay when IPL is used:**

```ts
alt.onServer('property:enterResult', (result: { ... }) => {
    if (result.success && result.interior) {
        if (result.interior.ipl) {
            loadPropertyIPL(result.interior.ipl);
            alt.setTimeout(() => doTeleport(result), 150);
        } else {
            doTeleport(result);
        }
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});
function doTeleport(result: { interior: { x: number; y: number; z: number; heading: number } }) {
    const player = alt.Player.local;
    if (player?.valid && result.interior) {
        native.setEntityCoordsNoOffset(player.scriptID, result.interior.x, result.interior.y, result.interior.z, false, false, false);
        native.setEntityHeading(player.scriptID, result.interior.heading);
    }
    addNotification(result.message);
}
```

---

## Checklist

- [ ] **[CONFIRMED BUG]** Consolidate dual `gta:spawn:safe` handlers (lines 720 + 953) into one (Phase 5.1 Option C, Phase 6).
- [ ] **[CONFIRMED BUG]** Apply Option A: stop emitting coords in `gta:spawn:safe` — trust server Z from `HOSPITAL_SPAWNS`, skip client ground probe for respawn (Phase 5.1).
- [ ] Add server and client logs for respawn and property enter (Phase 2).
- [ ] Reproduce both bugs and capture logs (Phase 1).
- [ ] Validate `HOSPITAL_SPAWNS` Z values in-game (Phase 3.1).
- [ ] Run `SELECT id, name, interior_x, interior_y, interior_z FROM properties` and fix wrong interiors (Phase 3.2, 5.2) — most likely root cause of Issue 2.
- [ ] Ensure client sends correct `propertyId` (Phase 5.2).
- [ ] **[CONFIRMED MISSING]** Add IPL delay (150ms) before teleport in `property:enterResult` client handler (Phase 4, 5.2, 7).
- [ ] Check dimension handling for properties (Phase 4).
- [ ] Test respawn at each hospital and entry for each property before closing the ticket.
- [x] ~~No silent fallback for property enter~~ — already implemented (`server/index.ts:580–586`).

This plan focuses on clean debugging (reproduce → log → validate data → fix) and stable, minimal changes so other systems (e.g. default spawn, other commands) are not broken.
