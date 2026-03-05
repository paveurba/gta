# GTA V alt:V Multiplayer Server

A full-featured GTA Online-style multiplayer server built on alt:V with the Rebar framework, MySQL persistence, and MongoDB for Rebar core.

## Features

### Core Systems
- **Authentication**: Register/login with email and password
- **Money System**: Cash and bank balance with MySQL persistence
- **Phone System**: Contacts, messaging between players
- **Property System**: Buy, sell, enter, and exit properties with garages
- **Vehicle System**: Buy, sell, store vehicles in property garages
- **Weapon Shop**: Purchase weapons and ammo from Ammu-Nation (weapons persist)
- **Clothing Shop**: Buy and save outfits
- **Casino**: Slot machines and roulette with betting

### World
- **GTA Online Style**: No AI pedestrians or traffic (clean multiplayer environment)
- **Static Parked Vehicles**: 45+ vehicles parked in realistic locations around the city
- **Map Blips**: All shops, properties, hospitals, and casino marked on the map
- **Death/Respawn System**: Players respawn at nearest hospital with $500 fee after 5 seconds

## Tech Stack

- **alt:V Server** - GTA V multiplayer framework
- **Rebar Framework** - TypeScript plugin architecture
- **MySQL 8** - Player data, money, weapons, properties, phone
- **MongoDB** - Rebar core character documents
- **Docker / Docker Compose** - Containerized deployment

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
```

### 2. Start with Docker

```bash
docker compose up -d
```

### 3. Rebuild after code changes

```bash
docker compose build --no-cache altv-server && docker compose up -d altv-server
```

### 4. View logs

```bash
docker compose logs -f altv-server
```

### 5. Connect

Connect with alt:V client to `localhost:7788`

## Chat Commands

### Authentication
| Command | Description |
|---------|-------------|
| `/register <email> <password>` | Create new account |
| `/login <email> <password>` | Login to existing account |

### Money
| Command | Description |
|---------|-------------|
| `/money` | Check cash and bank balance |
| `/givemoney <amount>` | Add money (debug) |

### Vehicles
| Command | Description |
|---------|-------------|
| `/car <model>` | Spawn a temporary vehicle |
| `/myvehicles` | List your owned vehicles |
| `/spawnvehicle <id>` | Spawn an owned vehicle |
| `/dealership` | Teleport to vehicle dealership |

### Weapons
| Command | Description |
|---------|-------------|
| `/weapons` | List available weapons |
| `/buyweapon <name>` | Purchase a weapon |

### Properties
| Command | Description |
|---------|-------------|
| `/properties` | List available properties |
| `/myproperties` | List owned properties |
| Press `E` near property | Open property menu (buy/enter/sell/garage) |

### Casino
| Command | Description |
|---------|-------------|
| `/slots <bet>` | Play slot machine |
| `/roulette <bet> <type> <value>` | Play roulette |

### Phone
| Command | Description |
|---------|-------------|
| `/contact <name> <number>` | Add a contact |
| `/contacts` | List contacts |
| `/sms <playerId> <message>` | Send message |

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

Tables managed by the server:

- `players` - Core player data (email, password, money, bank)
- `player_weapons` - Weapon persistence (hash, ammo)
- `player_clothes` - Clothing persistence (component, drawable, texture)
- `player_vehicles` - Vehicle ownership (model, colors, garage location)
- `properties` - Property ownership, locations, and garage slots
- `phone_contacts` - Player phone contacts
- `phone_messages` - Player messages
- `casino_transactions` - Casino game history
- `transaction_logs` - Audit trail for all transactions

See `database/init/001_schema.sql` for full schema.

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
- Ammu-Nation Pillbox Hill
- Ammu-Nation Little Seoul
- Ammu-Nation Cypress Flats
- Ammu-Nation Sandy Shores
- Ammu-Nation Paleto Bay
- Ammu-Nation Tataviam Mountains

### Clothing Shops (Blue shirt icon)
- Suburban (Innocence Blvd)
- Suburban (Chumash)
- Suburban (Hawick)
- Ponsonbys (Rockford Hills)
- Ponsonbys (Burton)
- Binco (Del Perro)
- Discount Store (Pillbox Hill)
- Discount Store (Harmony)

### Casino (Gold chip icon)
- Diamond Casino

### Hospitals (Pink cross icon)
- Pillbox Hill Medical Center
- Mount Zonah Medical Center
- Sandy Shores Medical Center
- Paleto Bay Medical Center

### Vehicle Dealerships (Yellow car icon)
- Premium Deluxe Motorsport (near airport)
- Simeon's Dealership

### Properties (House icons)
- Green = For sale
- Blue = Owned by you
- Gray = Owned by another player

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
| `altv-server` | 7788 | Game server |
| `mysql` | 3306 | MySQL database |
| `mongodb` | 27017 | MongoDB (Rebar core) |

## Environment Variables

```env
DB_HOST=mysql
DB_PORT=3306
DB_NAME=gta_rebar
DB_USER=gta
DB_PASSWORD=gta_password
MONGODB=mongodb://mongodb:27017
GAME_PORT=7788
```

## License

MIT
