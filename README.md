# GTA V alt:V Multiplayer Server

A full-featured GTA Online-style multiplayer server built on alt:V with the Rebar framework, MySQL persistence, and MongoDB for Rebar core.

## Features

### Core Systems
- **Authentication**: Register/login with email and password
- **Money System**: Cash and bank balance with MySQL persistence
- **Phone System**: Contacts, messaging between players
- **Property System**: Buy, sell, enter, and exit properties
- **Weapon Shop**: Purchase weapons and ammo from Ammu-Nation
- **Clothing Shop**: Buy and save outfits
- **Casino**: Slot machines and roulette with betting

### World
- **GTA Online Style**: No AI pedestrians or traffic (clean multiplayer environment)
- **Static Parked Vehicles**: 45+ vehicles parked in realistic locations around the city
- **Map Blips**: All shops, properties, and casino marked on the map

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

### 3. View logs

```bash
docker compose logs -f altv-server
```

### 4. Connect

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
| `/car <model>` | Spawn a vehicle |

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
| `/buyproperty <id>` | Buy a property |
| `/sellproperty <id>` | Sell a property (70% value) |
| `/enter` | Enter nearby owned property |
| `/exit` | Exit property |

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
| `P` | Open phone menu |

## Database Schema

Tables managed by the server:

- `players` - Core player data (email, password, money, bank)
- `player_weapons` - Weapon persistence (hash, ammo)
- `player_clothes` - Clothing persistence (component, drawable, texture)
- `properties` - Property ownership and locations
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
| `PropertyService` | Buy/sell/enter/exit properties |
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

### Clothing Shops (Blue shirt icon)
- Suburban
- Ponsonbys
- Binco
- Discount Store

### Casino (Gold chip icon)
- Diamond Casino

### Properties (House icons)
- Green = For sale
- Blue = Owned

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
