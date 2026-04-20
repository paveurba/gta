# Character Appearance & Personality — Technical Review and Improvement Plan

A technical review of the current player personality/character appearance implementation on the alt:V roleplay server, with an improvement plan for registration, storage, load, and editing.

---

## 1. How to Audit the Current Implementation

### 1.1 Where appearance data is stored

| Data | Current location | Notes |
|------|------------------|--------|
| **Appearance** (face, hair, sex, overlays, etc.) | **MongoDB** — Rebar `Character` document, field `appearance` | Type: `Partial<Appearance> \| Appearance` from `@Shared/types/appearance.js`. Persisted via `db.update(…, CollectionNames.Characters)` in `src/main/server/document/character.ts`. |
| **Clothing** (component/drawable/texture) | **Dual:** (1) **MySQL** `player_clothes` table (`player_id`, `component`, `drawable`, `texture`) — **no `dlc`, `isProp`, or `palette` columns**; (2) **MongoDB** `Character.clothing` (array of `ClothingComponent` with `id`, `drawable`, `texture`, `dlc`, `isProp`, `palette`). | On login only MySQL clothing is applied (`loadPlayerClothing`). Rebar `Character.clothing` is not used because character bind uses `syncPlayer: false`. The extended fields (`dlc`, `isProp`, `palette`) exist only in the Rebar type — they are never persisted to MySQL. |
| **Character document** (Rebar) | **MongoDB** — keyed by `email` in gta-mysql-core. Created in `bindCharacterForPlayer` with `email`, `account_id`, `name`, `pos`, `health`, `armour`, `cash`, `bank` — **no `appearance` or `clothing`**. |

**Files to inspect:**

- `src/main/shared/types/appearance.ts` — `Appearance` type (sex, face blend, structure, hair, overlays, tattoos, etc.).
- `src/main/shared/types/character.ts` — `Character.appearance`, `Character.clothing`, `Character.skin`.
- `src/plugins/gta-mysql-core/server/index.ts` — `bindCharacterForPlayer`, `completeLogin`, `loadPlayerClothing`.
- `src/main/server/document/character.ts` — `set()`, `useCharacterBinder` (syncPlayer), MongoDB update.
- `src/main/server/player/appearance.ts` — `apply()`, `sync()`, and barber-style setters that call `document.set('appearance', …)`.
- `src/main/server/player/clothing.ts` — `apply()`, `sync()` (from Character); gta-mysql-core uses MySQL only on login.
- `src/plugins/gta-mysql-core/server/services/ClothingShopService.ts` — `loadPlayerClothing`, `saveClothing`, `player_clothes` table.
- `src/plugins/gta-mysql-core/server/database/migrations.ts` — `player_clothes` schema; no appearance table.

### 1.2 How it is saved during registration

- **Current:** Registration does **not** save appearance. In `bindCharacterForPlayer`:
  - If no character exists for `email`, a new document is created with: `email`, `account_id`, `name`, `pos`, `health`, `armour`, `cash`, `bank`.
  - There is no character creator step that sets `appearance` or `clothing` before or after `db.create`.
- **Result:** New characters have no `appearance` in the Rebar document. Any later use of `usePlayerAppearance(player).sync()` would apply nothing (or defaults) because `data.appearance` is undefined.

### 1.3 How it is loaded on player spawn / login

- **Login flow** (`completeLogin`):  
  1. `bindCharacterForPlayer(player, session.email)` — loads or creates Rebar Character and calls `characterBinder.bind(document)` with **`syncPlayer: false`**.  
  2. `spawnPlayerSafe(player)` — sets model to `mp_m_freemode_01`, spawn position, health.  
  3. `weaponService.loadWeaponsToPlayer`.  
  4. `clothingShopService.loadPlayerClothing(player, session.oderId)` — reads **MySQL** `player_clothes` and applies `player.setClothes(component, drawable, texture, 0)`.

- **Rebar sync:** Because `syncPlayer` is `false`, `usePlayerAppearance(player).sync()` and `useClothing(player).sync()` are **never** called on bind. So:
  - **Appearance** from MongoDB is never applied on login.
  - **Clothing** from MongoDB is never applied; only MySQL clothing is.

- **Respawn:** Same player session; character document remains bound. If respawn only resets position/health and does not re-apply appearance/clothing, the ped keeps whatever was last set (so no reset unless something else overwrites it).

**Summary:** Appearance is not set at registration and is not applied on login. Only MySQL-based clothing is applied on login.

---

## 2. Database Structure

### 2.1 Recommended approach: single source of truth

Choose one primary store for appearance and clothing to avoid desync:

- **Option A — MySQL (recommended for your stack):** You already use MySQL for players, money, properties, vehicles, and clothing. Add an **appearance** store in MySQL and, on login, apply appearance from MySQL then clothing from MySQL. Optionally mirror to Rebar Character for any Rebar features that read `character.appearance` / `character.clothing`.
- **Option B — MongoDB (Rebar) only:** Store appearance and clothing only in the Rebar Character document. On login, bind with **`syncPlayer: true`** and ensure the character document is populated (registration flow must create/save appearance). Migrate or sync MySQL `player_clothes` into Rebar `Character.clothing` so one source remains.

Below assumes **Option A (MySQL)** for consistency with the rest of gta-mysql-core.

### 2.2 Recommended MySQL schema

**Table: `character_appearance`**  
One row per character/player. Use `player_id` if one character per account, or a `character_id` if you support multiple characters per account.

```sql
CREATE TABLE IF NOT EXISTS character_appearance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL UNIQUE,
    -- Face
    sex TINYINT NOT NULL DEFAULT 1,
    face_father TINYINT UNSIGNED NOT NULL DEFAULT 0,
    face_mother TINYINT UNSIGNED NOT NULL DEFAULT 0,
    skin_father TINYINT UNSIGNED NOT NULL DEFAULT 0,
    skin_mother TINYINT UNSIGNED NOT NULL DEFAULT 0,
    face_mix FLOAT NOT NULL DEFAULT 0.5,
    skin_mix FLOAT NOT NULL DEFAULT 0.5,
    structure JSON NULL,
    -- Hair
    hair INT UNSIGNED NOT NULL DEFAULT 0,
    hair_dlc INT UNSIGNED NOT NULL DEFAULT 0,
    hair_color1 INT UNSIGNED NOT NULL DEFAULT 0,
    hair_color2 INT UNSIGNED NOT NULL DEFAULT 0,
    hair_overlay_collection VARCHAR(64) NULL,
    hair_overlay_name VARCHAR(64) NULL,
    -- Overlays (facial hair, eyebrows, chest, blemishes, etc.)
    facial_hair INT UNSIGNED NOT NULL DEFAULT 0,
    facial_hair_opacity FLOAT NOT NULL DEFAULT 0,
    facial_hair_color1 INT UNSIGNED NOT NULL DEFAULT 0,
    eyebrows INT UNSIGNED NOT NULL DEFAULT 0,
    eyebrows_opacity FLOAT NOT NULL DEFAULT 0,
    eyebrows_color1 INT UNSIGNED NOT NULL DEFAULT 0,
    chest_hair INT UNSIGNED NOT NULL DEFAULT 0,
    chest_hair_opacity FLOAT NOT NULL DEFAULT 0,
    chest_hair_color1 INT UNSIGNED NOT NULL DEFAULT 0,
    eyes INT UNSIGNED NOT NULL DEFAULT 0,
    head_overlays JSON NULL,
    tattoos JSON NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

- **`structure`:** JSON array of 20 floats (face feature indices -1.0 to 1.0).  
- **`head_overlays`:** JSON array of `{ id, value, color1, color2, opacity }`.  
- **`tattoos`:** JSON array of `{ collection, overlay }`.

**Existing: `player_clothes`**
Current schema has only `(id, player_id, component, drawable, texture)` — no `dlc`, `isProp`, or `palette` columns. If you use DLC clothing or props, you will need to add those columns (and update `saveClothing`/`loadPlayerClothing` accordingly).

### 2.3 Storing face features, hair, clothing, tattoos

| Data | Storage | Example |
|------|---------|--------|
| Face blend | Columns | `face_father`, `face_mother`, `face_mix`, `skin_*` |
| Face structure (20 floats) | JSON `structure` | `[-0.2, 0.1, …]` |
| Hair | Columns + optional overlay | `hair`, `hair_dlc`, `hair_color1/2`, `hair_overlay_*` |
| Overlays (blemishes, ageing, etc.) | JSON `head_overlays` | `[{ "id": 0, "value": 1, "color1": 0, "color2": 0, "opacity": 1 }]` |
| Tattoos | JSON `tattoos` | `[{ "collection": "mpbeach_overlays", "overlay": "MP_Bea_M_Back_000" }]` |
| Clothing | Table `player_clothes` | One row per component (e.g. 11, 4, 6, 8…). Current schema: `(id, player_id, component, drawable, texture)` — no `dlc`/`isProp`/`palette`. |

---

## 3. Server-Side Architecture

### 3.1 Best practice for loading and applying appearance

1. **Order of application (login/spawn):**  
   - Set **model** from appearance sex (or default) so clothing and overlays match.  
   - Apply **appearance** (head blend, structure, hair, overlays, eyes, tattoos).  
   - Apply **clothing** (from MySQL or from Rebar, but one source).

2. **Single function:** One “apply character look” function that: loads appearance row (or Rebar document), loads clothing rows, then calls in order: `usePlayerAppearance(player).apply(appearance)` (or equivalent native calls), then applies each clothing component. That way respawn/reconnect can call the same function.

3. **Defaults:** If no appearance row exists (e.g. new character), apply a default Appearance (e.g. male/female freemode, default face/hair) and optionally save it so the next load is consistent.

### 3.2 Syncing appearance with the client

- **Server authority:** Server owns the source of truth (DB). Server applies appearance and clothing to the ped with `player.setHeadBlendData`, `player.setClothes`, etc. alt:V syncs the ped model and clothes to clients automatically; no need to send raw appearance to client for other players.
- **Local player:** The local player’s appearance is set by the server; the client just receives the same ped updates as everyone else.
- **Character creator (client UI):** If the creator runs in a webview or client script, the client sends the chosen appearance (e.g. JSON) to the server; the server validates, saves to DB, then applies it to the player so all clients see the same.

### 3.3 Respawn and reconnect

- **Respawn:** Do not strip appearance. After setting position/health, re-apply appearance and clothing from the same source (e.g. call the same “apply character look” function) so that any accidental clear (e.g. model change) is corrected.
- **Reconnect:** On full reconnect, the player goes through login again: bind character, then apply appearance from DB, then clothing from DB. Ensure this runs after spawn so the ped is created before applying head blend and clothes.

---

## 4. Character Editing System

### 4.1 How players modify appearance later

- **Barber:** Change hair, hair color, facial hair, eyebrows (and optionally chest hair). Server event receives the new values, validates ranges, updates DB, then applies to player (e.g. `document.set('appearance', newAppearance)` for Rebar, or UPDATE `character_appearance` + apply from MySQL).
- **Clothing shop:** Already in place: buy applies and saves to `player_clothes`. Ensure “try on” does not persist until purchase; only `buyClothing` (or equivalent) writes to DB.
- **Plastic surgery / face editor:** Change face blend, structure, overlays, eyes. Same pattern: server receives payload, validates, saves, applies.

### 4.2 What data should be changeable

| Location | Changeable | Validation |
|----------|------------|------------|
| Barber | hair, hair_dlc, hair_color1/2, hair_overlay, facial_hair*, eyebrows*, chest_hair* | Index bounds, opacity 0–1, color IDs |
| Clothing shop | component, drawable, texture (and optionally dlc, palette) | Catalog / component list |
| Plastic surgery | face_father/mother, skin_*, face_mix, skin_mix, structure, eyes, head_overlays | Blend 0–45, mix 0–1, structure length 20, value ranges |
| Tattoos | tattoos array | Valid collection/overlay names |

### 4.3 Safe database updates

- **Single transaction per “save”:** When the user confirms (e.g. “Pay & apply”), run one UPDATE (or one INSERT … ON DUPLICATE KEY UPDATE) for appearance and one or more for clothing so the state is consistent.
- **Validate on server:** Never trust client numeric values; clamp to valid ranges (e.g. GTA component IDs, overlay IDs, 0–1 for mix/opacity).
- **Idempotent apply:** After every DB write, re-apply appearance and clothing from the DB so server and client stay in sync even if a previous apply failed partially.

---

## 5. Common Mistakes to Check

| Issue | What to check | Fix |
|-------|----------------|-----|
| **Appearance resets after reconnect** | Login flow does not load appearance, or applies default then never applies saved. | Load appearance from DB after bind and call apply (and apply clothing) in a single “apply character look” step. |
| **Data not saving correctly** | Registration or editor does not write to DB; or writes to wrong table/key. | Ensure registration/creator writes to `character_appearance` (or Rebar Character); ensure barber/surgery/clothing write to the same store you read on login. |
| **Client/server desync** | Client applies something (e.g. from webview) but server never applies it, or server applies from stale data. | Server authority: server saves then applies from DB; client only sends choices; do not let client set ped appearance for the authoritative view. |
| **Default skin overriding saved appearance** | Spawn sets `player.model = 'mp_m_freemode_01'` then clothing/appearance load runs but uses wrong sex or overwrites. | Apply appearance first (including sex/model), then clothing; avoid setting a default model after loading appearance. |
| **Two clothing sources** | MySQL `player_clothes` applied on login; Rebar `Character.clothing` never applied (syncPlayer: false). | Pick one source: e.g. use only MySQL and optionally sync to Rebar for compatibility, or migrate to Rebar only and bind with syncPlayer: true. |
| **New character has no appearance** | `bindCharacterForPlayer` creates document without `appearance`. | Add a character creator step that creates/saves an initial appearance (default or user-chosen) before or right after first bind. |

---

## 6. Recommended Implementation Structure

### 6.1 Example server-side flow

**Registration → save → spawn → load → update**

1. **Registration (auth)**  
   - Create account (e.g. `players` row with email, password_hash).  
   - If you use a **character creator** in the same flow: client sends appearance (and optionally initial clothing). Server creates `character_appearance` row (and initial `player_clothes` rows). If you use Rebar Character, create the document with `appearance` and optionally `clothing` populated.

2. **First login**  
   - Load character (Rebar by email or MySQL by player_id).  
   - If MySQL: load `character_appearance` for `player_id`; if none, apply default appearance and INSERT default row.  
   - Load `player_clothes` for `player_id`.  
   - Spawn player (position, model from appearance sex if applicable).  
   - Apply appearance (from MySQL or from Rebar document), then apply clothing.  
   - Sync money, weapons, etc.

3. **Later logins**  
   - Same as first login: load appearance + clothing from DB, spawn, apply appearance then clothing.

4. **Respawn**  
   - After setting position/health, optionally re-apply appearance and clothing from the same DB (or from bound Rebar document) so the ped is never left in a default or half-applied state.

5. **Barber / plastic surgery / clothing**  
   - Server receives event with new data → validate → UPDATE DB (or Rebar `document.set`) → apply to player from the updated data.

### 6.2 Example flow (pseudocode)

```text
// ---- REGISTRATION (with character creator) ----
onClient('auth:register', ...) -> create account
onClient('auth:createCharacter', player, appearanceJson, initialClothing?) ->
  validate appearanceJson
  playerId = getPlayerId(player)
  INSERT character_appearance (player_id, ...) FROM appearanceJson
  IF initialClothing: INSERT player_clothes for each
  (Optional) create/update Rebar Character with same appearance/clothing

// ---- LOGIN ----
completeLogin(player, session):
  bindCharacterForPlayer(player, session.email)   // Rebar: load or create doc
  spawnPlayerSafe(player)                         // position + default model if needed
  appearance = loadAppearanceFromMySQL(session.oderId)
  if (!appearance) appearance = getDefaultAppearance(); saveAppearanceMySQL(session.oderId, appearance)
  applyAppearance(player, appearance)
  loadPlayerClothing(player, session.oderId)     // existing MySQL clothing
  weaponService.loadWeaponsToPlayer(...)
  syncMoneyToClient(player)

// ---- RESPAWN ----
onPlayerRespawn(player):
  set position/health
  appearance = loadAppearanceFromMySQL(session.oderId)  // or from Rebar doc
  if (appearance) applyAppearance(player, appearance)
  loadPlayerClothing(player, session.oderId)

// ---- BARBER ----
onClient('barber:apply', player, hair, hairColor1, hairColor2, facialHair, ...):
  validate ranges
  updateAppearanceInMySQL(playerId, { hair, hairColor1, ... })
  applyAppearance(player, loadAppearanceFromMySQL(playerId))
  charge and notify
```

### 6.3 Example modules

- **AppearanceService** (or extend existing): `loadAppearance(playerId)`, `saveAppearance(playerId, data)`, `getDefaultAppearance(sex)`. Uses MySQL `character_appearance` (and optionally syncs to Rebar Character).
- **applyAppearance(player, appearance):** Either call existing `usePlayerAppearance(player).apply(appearance)` with a plain object shaped like `Appearance`, or implement a small helper that maps your MySQL row (or Rebar document) to the same shape and then calls that.
- **Login flow:** After `bindCharacterForPlayer` and spawn, call `applyAppearance` then `loadPlayerClothing` so both run from your chosen source of truth.

---

## Summary

- **Current state:** Appearance lives only in Rebar MongoDB and is not set at registration; it is not applied on login because bind uses `syncPlayer: false`. Only MySQL clothing is applied on login.  
- **Audit:** Trace storage (MongoDB + MySQL), registration (no appearance saved), and login (appearance never applied, only MySQL clothing).  
- **Recommendation:** Introduce a single source of truth (e.g. MySQL `character_appearance` + existing `player_clothes`), add a registration/creator path that saves appearance, and on every login and respawn apply appearance then clothing from that store. Use the same apply path for barber, plastic surgery, and clothing shop so updates are consistent and reliable.

This structure keeps architecture clean, avoids client/server desync, and makes it easy to add or change character editing features later.
