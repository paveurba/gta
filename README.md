# GTA V alt:V Multiplayer Server

A full-featured GTA Online-style multiplayer server built on alt:V with the Rebar framework, MySQL persistence, and MongoDB for Rebar core.

## Features

### Core Systems
- **Authentication**: Register/login with email and password
- **Money System**: Cash and bank balance with MySQL persistence
- **Phone System**: Contacts and SMS-style messages (native in-game phone menu on **M**; not the Vue webview)
- **Property System**: Buy, sell, enter, and exit properties with garages
- **Vehicle System**: Buy, sell, store vehicles in property garages
- **Weapon Shop**: Ammu-Nation — native client menu (**E** at red blips); weapons and ammo persist in MySQL (not the Vue webview)
- **Clothing Shop**: Native client menu (**E** at blue blips); outfits persist in `player_clothes`
- **Casino**: Slots and roulette via chat and/or in-world client flow; bets update MySQL cash and `casino_transactions`

### World
- **GTA Online Style**: No ambient pedestrians or traffic — client zeros density **every frame** and disables population budgets / dispatch on **`connectionComplete`** (see `disableAmbientPopulation` / `disablePopulationOnce` in `client/index.ts`)
- **Static Parked Vehicles**: **46** server-spawned parked vehicles from `PARKED_VEHICLE_SPAWNS` in `server/index.ts` (unlocked, engine off)
- **Map Blips**: Weapon, clothing, casino, property, hospital, and dealership markers from `gta:locations:update`, `property:list`, and client constants — details in `.planning/phases/06-world-webview/06-BLIPS-AND-STATIC.md`
- **Death/Respawn System**: Server **`playerDeath`** → nearest **`HOSPITAL_SPAWNS`** after **5000 ms**; **$500** hospital fee when the player has enough cash (`HOSPITAL_FEE` in `server/index.ts`). Client shows a matching **5 s** WASTED overlay and fee hint

## Tech Stack

- **alt:V Server** - GTA V multiplayer framework
- **Rebar Framework** - TypeScript plugin architecture
- **MySQL 8** - Player data, money, weapons, properties, phone
- **MongoDB** - Rebar core character documents
- **Docker / Docker Compose** - Containerized deployment
- **Vue 3 + Vite** - Rebar **webview** UI shell; production bundle is written to **`resources/webview`** (`webview/vite.config.ts`). Full compile (**TypeScript + webview**) runs inside **`scripts/compile.js`**, which Docker/`pnpm refresh` uses — see **Webview** below

## Webview (Vue)

Gameplay HUDs documented above (auth, phone, shops, properties, etc.) are implemented in the **native** `gta-mysql-core` client, not in Vue. The **`webview/`** app is still built on every full **`compile.js`** run (`pnpm refresh`, Docker image build, `pnpm start`) and outputs to **`resources/webview`**. **`webview/pages/plugins.ts`** → **`PLUGIN_IMPORTS`** is auto-generated and may be **empty** until you register plugin pages. For build steps and smoke checks, see `.planning/phases/06-world-webview/06-WEBVIEW.md`.

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
```

### 2. Start with Docker

```bash
docker compose up -d
```

### 3. After code changes

After changing **any** code (`src/` TypeScript or `webview/` Vue), run:

```bash
pnpm refresh
```

This rebuilds the server image (full compile: TypeScript + webview runs inside Docker) and restarts all game containers.

**Other commands:**

| Command | Description |
|--------|-------------|
| `pnpm refresh` | Rebuild image (full compile) + restart all containers. Use after any code change. |
| `pnpm compile:ts` | TypeScript only, no Docker. Use when running server locally (`pnpm start`). |
| `docker compose up --build -d` | Same as refresh but without running compile:ts first (Docker build does full compile). |

### 4. View logs

```bash
docker compose logs -f altv-server
```

### 5. Connect

Connect with alt:V client to `localhost:7788`.

**Note for Apple Silicon (M1/M2) or ARM:** You may see a warning that the image platform (linux/amd64) does not match the host (linux/arm64). The server runs under emulation and is fine to use; you can ignore the warning.

---

## After making changes

**One command (Docker):**

```bash
pnpm refresh
```

This runs a full rebuild (TypeScript + webview) inside Docker and restarts all game containers. Use it after any change in `src/` or `webview/`.

**Without Docker** (running `pnpm start` locally): run the full compile (`node ./scripts/compile.js` or `pnpm build:docker`), then restart the server.

## Chat Commands

### Authentication

Registration and login use the **Auth UI** (press **T** to open). The UI talks to the server over `auth:register` / `auth:login` (not chat arguments).

| Action | Description |
|--------|-------------|
| **Register** | In the Auth UI: provide **username** (3–32 chars, letters/numbers/`_`/`-`), **email**, and **password** (min 6 chars). |
| **Login** | In the Auth UI: **username or email** plus **password**. |
| `/register`, `/login` | Not supported as chat commands — the server replies: `Use the Auth menu (press T) to login or register.` |
| `/logout` | Log out (saves weapons, clears session). |

**Passwords:** Stored in MySQL as **bcrypt** hashes (`players.password_hash`). Cost rounds come from **`BCRYPT_ROUNDS`** in `.env` (default **10**). See `src/plugins/gta-mysql-core/server/services/AuthService.ts`.

### Money

Cash and bank are stored in the **`players`** table in MySQL. The session is updated on commands and written with `UPDATE players SET money = ?, bank = ? WHERE email = ?` on disconnect, respawn fees, `/givemoney`, and other spend flows.

| Command | Description |
|---------|-------------|
| `/money` | Check cash and bank balance |
| `/givemoney <amount>` | Add money (debug) |

### Vehicles
| Command | Description |
|---------|-------------|
| `/car <model>` | Spawn a **temporary** vehicle next to you (not saved to MySQL; default model `sultan`) |
| `/myvehicles` | List your owned vehicles (MySQL `player_vehicles`) |
| `/spawnvehicle <id>` | Spawn an owned vehicle by database id |
| `/dealership` | Teleport to **Premium Deluxe Motorsport** (same coords as `VEHICLE_DEALERSHIPS[0]` in code) |

**Buying catalog vehicles:** Use **E** at a dealership to open the native client menu (`client/index.ts`), then purchase via `vehicle:buy`. There is no `/buyvehicle` chat command for the catalog.

### Weapons

Catalog purchases use the **native** weapon shop UI in `src/plugins/gta-mysql-core/client/index.ts`: stand near an **Ammu-Nation** red blip and press **E** to open the menu (`weaponshop:getCatalog` / `weaponshop:buy`). Ammo refills use **`weaponshop:buyAmmo`** from the same shop flow when implemented in the client.

| Command | Description |
|---------|-------------|
| `/weapons` | Short hint + sample weapon names (full list in-game via shop catalog) |
| `/buyweapon <name>` | Buy by catalog **name** (e.g. `/buyweapon Pistol`) — same server path as `weaponshop:buy` |

**Ammu-Nation coordinates** (`WEAPON_SHOP_LOCATIONS` in code):

| x | y | z |
|---|-----|-----|
| 19.80 | -1106.90 | 29.80 |
| -661.90 | -933.50 | 21.83 |
| 811.20 | -2159.40 | 29.62 |
| 1692.80 | 3761.40 | 34.71 |
| -330.70 | 6085.20 | 31.45 |
| 2569.30 | 292.40 | 108.73 |

See also `.planning/phases/05-shops-casino/05-WEAPONS-SERVER.md`.

### Clothing

There is **no** chat command to buy clothing; use **E** at a clothing store (**blue** blip) for the native menu (`clothingshop:getCatalog`, preview, `clothingshop:buy`). Purchased components are stored in **`player_clothes`** and re-applied on login and respawn (after appearance). Details: `.planning/phases/05-shops-casino/05-CLOTHING-SERVER.md`.

### Properties
| Command | Description |
|---------|-------------|
| `/properties` | List **for-sale** properties only (`owner_player_id IS NULL`) |
| `/myproperties` | List **your** owned properties (requires login) |
| Press `E` near property | Open **native** property menu in `gta-mysql-core` client (buy / enter / sell / garage) |

**Garages:** Each property has a **`garage_slots`** limit in MySQL (see table below). Storing a vehicle checks the count of rows in `player_vehicles` with that `garage_property_id`; when full, the server returns a message containing **`Garage is full`**. Use the property menu’s garage flow (client) or the `vehicle:store` / `vehicle:storeNearby` RPCs documented under phase 04 planning.

### Casino

Bets must be between **$100** and **$100,000** and cannot exceed cash on hand (`CasinoService.validateBet`). Outcomes update **`players.money`**, **`casino_transactions`**, and **`transaction_logs`**.

| Command | Description |
|---------|-------------|
| `/slots <bet>` | Play slots; **default bet 100** if `<bet>` omitted or invalid |
| `/roulette <bet> <type> <value>` | **Defaults:** `type=color`, `value=red` if omitted. Types: **`number`** (value 0–36), **`color`** (`red` / `black` / `green`), **`odd`**, **`even`** (value ignored) |
| `/casino` | Teleport to **Diamond Casino** `924.0, 46.0, 81.1` (same as `CASINO_LOCATIONS[0]`) |

Examples: `/roulette 500 color black`, `/roulette 200 number 7`, `/roulette 100 even 0`. RPCs `casino:playSlots` / `casino:playRoulette` mirror these rules. More detail: `.planning/phases/05-shops-casino/05-CASINO-SERVER.md`.

### Phone

The phone UI is drawn in the **alt:V client resource** (`src/plugins/gta-mysql-core/client/index.ts`) with **GTA natives** — it is **not** part of the Vue `webview/` app.

| Command | Description |
|---------|-------------|
| `/contact <name> <number>` | Add a contact (`contact_number` stored as you type it — often another player’s **`players.id`** as digits) |
| `/contacts` | List contacts |
| `/sms <playerId> <message>` | Send a message; **`<playerId>` is the MySQL `players.id`** (same as account id after login), **not** the alt:V connection id |

### Utility
| Command | Description |
|---------|-------------|
| `/tp <x> <y> <z>` | Teleport to coordinates |
| `/casino` | Teleport to Diamond Casino |
| `/help` | Show all commands |

## Hotkeys

| Key | Action |
|-----|--------|
| `T` | Open chat |
| `M` | Open phone menu |
| `E` | Interact (shops, properties, dealerships) |
| `ESC` | Close menus |
| `W/S` | Navigate menus |
| `1-4` | Select menu options |

## Database Schema

Tables managed by the server (created by `runMigrations()` in `src/plugins/gta-mysql-core/server/database/migrations.ts` on server start; `database/init/001_schema.sql` is mounted into MySQL for first-time container init):

- `players` - Core player data (email, password, money, bank)
- `player_weapons` - Weapon persistence (hash, ammo)
- `player_clothes` - Clothing persistence (component, drawable, texture)
- `character_appearance` - Face, hair, overlays, tattoos (one row per player)
- `player_vehicles` - Vehicle ownership (model, colors, garage location)
- `properties` - Property ownership, locations, and garage slots
- `phone_contacts` - Player phone contacts
- `phone_messages` - Player messages
- `casino_transactions` - Casino game history
- `transaction_logs` - Audit trail for all transactions

See `database/init/001_schema.sql` for full DDL reference.

## Project Structure

```
src/plugins/gta-mysql-core/
├── server/
│   ├── index.ts              # Main server plugin
│   ├── database/
│   │   └── migrations.ts     # Auto-run database migrations
│   └── services/
│       ├── PlayerWeaponService.ts
│       ├── PropertyService.ts
│       ├── VehicleService.ts
│       ├── WeaponShopService.ts
│       ├── ClothingShopService.ts
│       ├── PhoneService.ts
│       └── CasinoService.ts
└── client/
    └── index.ts              # Client-side UI and controls
```

## Services

| Service | Description |
|---------|-------------|
| `PlayerWeaponService` | Load/save player weapons |
| `PropertyService` | Buy/sell/enter/exit properties with garages |
| `VehicleService` | Buy/sell/spawn/store vehicles |
| `WeaponShopService` | Weapon catalog and purchases |
| `ClothingShopService` | Clothing catalog and purchases |
| `PhoneService` | Contacts and messaging |
| `CasinoService` | Slots and roulette games |

## Map Locations

### Weapon Shops (Red gun icon)

Six **Ammu-Nation** markers; coordinates match `WEAPON_SHOP_LOCATIONS`:

| x | y | z |
|---|-----|-----|
| 19.80 | -1106.90 | 29.80 |
| -661.90 | -933.50 | 21.83 |
| 811.20 | -2159.40 | 29.62 |
| 1692.80 | 3761.40 | 34.71 |
| -330.70 | 6085.20 | 31.45 |
| 2569.30 | 292.40 | 108.73 |

### Clothing Shops (Blue shirt icon)

Eight stores; names and coords match `CLOTHING_SHOP_LOCATIONS`:

| x | y | z | Label |
|---|-----|-----|--------|
| 72.30 | -1398.90 | 29.37 | Suburban |
| -163.10 | -302.70 | 39.73 | Ponsonbys |
| -1192.60 | -768.30 | 17.32 | Binco |
| 425.70 | -806.20 | 29.49 | Discount Store |
| -708.20 | -152.30 | 37.42 | Ponsonbys |
| -1193.90 | -766.90 | 17.32 | Suburban |
| 127.00 | -223.20 | 54.56 | Suburban |
| 617.30 | 2759.60 | 42.09 | Discount Store |

### Casino (Gold chip icon)
- **Diamond Casino** — `924.0, 46.0, 81.1`

### Hospitals (Pink cross icon)

Map blips use **client** coords (`HOSPITALS` in `client/index.ts`). **Death respawn** uses **server** **`HOSPITAL_SPAWNS`** (street-level); for Pillbox they differ so the icon is near the hospital while spawn uses configured ground coords.

| Hospital (blip) | Blip x,y,z |
|-----------------|------------|
| Pillbox Hill Medical Center | 340.25, -580.59, 28.82 |
| Mount Zonah Medical Center | -449.67, -340.55, 34.51 |
| Sandy Shores Medical Center | 1839.44, 3672.71, 34.28 |
| Paleto Bay Medical Center | -247.46, 6331.23, 32.43 |

### Vehicle Dealerships (Yellow car icon)
- **Premium Deluxe Motorsport** — `-56.49, -1097.25, 26.42` (`/dealership` teleports here)
- **Simeon's Dealership** — `-31.66, -1106.95, 26.42`

### Properties (House icons)
- **Green** = For sale (`owner_player_id` null)
- **Blue** = Owned (any owner; blip label shows “(Owned)” — the client does **not** use a separate grey blip for other players’ properties)

**Property Locations with Garage Slots:**
| Property | Price | Garage Slots |
|----------|-------|--------------|
| Unit 124 Popular St | $25,000 | 2 |
| 0115 Bay City Ave | $80,000 | 4 |
| 0504 S Mo Milton Dr | $150,000 | 6 |
| 0184 Milton Rd | $300,000 | 8 |
| Eclipse Towers Penthouse | $500,000 | 10 |

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `altv-server` | `${GAME_PORT:-7788}` TCP/UDP | Game server (`7788` inside container; host port from `GAME_PORT`) |
| `mysql` | `${MYSQL_EXPOSE_PORT:-3306}` → `3306` in container | MySQL (host port overridable via `MYSQL_EXPOSE_PORT` in `.env`) |
| `mongodb` | `27017` | MongoDB (Rebar core) |

## Environment Variables

Values below match `docker-compose.yml` and `.env.example`. Copy `.env.example` to `.env` and adjust.

```env
GAME_PORT=7788

DB_HOST=mysql
DB_PORT=3306
DB_NAME=gta_rebar
DB_USER=gta
DB_PASSWORD=gta_password
DB_ROOT_PASSWORD=root_password
MYSQL_EXPOSE_PORT=3306

MONGODB=mongodb://mongodb:27017

BCRYPT_ROUNDS=10

MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=GTA Server
```

## License

MIT
