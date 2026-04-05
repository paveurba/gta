# Roadmap: GTA (alt:V Rebar server)

## Overview

The codebase already implements the documented GTA-style multiplayer server. Phases group **v1 requirements** so work can be **verified, hardened, and evolved** in coherent slices: platform first, then identity and economy, social/phone, housing and vehicles, commerce and casino, then world presentation and webview.

## Phases

- [x] **Phase 1: Platform & persistence** — Docker stack, migrations, documented refresh path (completed 2026-04-05)
- [x] **Phase 2: Identity & economy** — Auth and money persistence (completed 2026-04-05)
- [x] **Phase 3: Phone & messaging** — Contacts, SMS, native phone UI (**M** key) (**UI hint**: yes) (completed 2026-04-05)
- [x] **Phase 4: Properties & vehicles** — Housing, garages, ownership, spawning (completed 2026-04-05)
- [x] **Phase 5: Shops & casino** — Weapons, clothing, gambling flows (completed 2026-04-05)
- [ ] **Phase 6: World & webview** — Blips, static vehicles, death/respawn, Vue UI

## Phase Details

### Phase 1: Platform & persistence

**Goal**: Operators can run the full stack and apply schema reliably; codebase changes rebuild cleanly.

**Depends on**: Nothing (first phase)

**Requirements**: OPS-01, OPS-02, OPS-03

**Success Criteria** (what must be TRUE):

1. Fresh `docker compose` brings up MySQL, MongoDB, and alt:V on documented ports
2. New MySQL volume gets schema from init scripts and migrations complete on server start
3. After TS/webview edits, documented refresh path produces a running server without manual hacks

**Plans**: 3 plans

Plans:

- [x] 01-01: Verify Compose services, env vars, and port mapping against `README.md`
- [x] 01-02: Validate migration path on empty DB and idempotency expectations
- [x] 01-03: Exercise `pnpm refresh` / compile path and document any gaps

### Phase 2: Identity & economy

**Goal**: Players can register, log in, and see persistent cash/bank.

**Depends on**: Phase 1

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, ECON-01, ECON-02

**Success Criteria** (what must be TRUE):

1. New user can register and log in via the **Auth UI** (press T)
2. Passwords are stored hashed (bcrypt), not plaintext
3. Logged-in player can inspect cash and bank; values survive reconnect (MySQL `players` table)

**Plans**: 3 plans

Plans:

- [x] 02-01: Trace `AuthService` + session binding (UI events → `completeLogin` → MySQL-backed session)
- [x] 02-02: Verify bcrypt configuration and failure modes (wrong password, duplicate email)
- [x] 02-03: Verify money read/write and persistence across reconnect

### Phase 3: Phone & messaging

**Goal**: Phone contacts and player-to-player messaging work with the **native client phone menu** (drawn in `client/index.ts`, **M** key), backed by `PhoneService` and MySQL.

**Depends on**: Phase 2

**Requirements**: PHON-01, PHON-02, PHON-03

**Success Criteria** (what must be TRUE):

1. Player can add/list contacts via chat
2. Player can send messages to another online player by **MySQL `players.id`**
3. Documented hotkey (**M**) opens the native phone UI without errors

**Plans**: 2 plans

Plans:

- [x] 03-01: Server-side phone flows (`PhoneService`) + chat commands
- [x] 03-02: Client native phone UI and `phone:*` event wiring

### Phase 4: Properties & vehicles

**Goal**: Buy/sell/enter/exit properties with garages; own and spawn vehicles with persistence.

**Depends on**: Phase 2

**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, VEH-01, VEH-02, VEH-03, VEH-04, VEH-05

**Success Criteria** (what must be TRUE):

1. Player can complete buy/sell/enter/exit property flows near interactions
2. Garage slots enforce configured limits; vehicles can be stored and retrieved
3. Owned vehicles list/spawn correctly; attributes persist in MySQL
4. Dealership / debug spawn flows behave as documented

**Plans**: 4 plans

Plans:

- [x] 04-01: Property purchase, ownership, enter/exit, sell
- [x] 04-02: Garage storage rules and edge cases
- [x] 04-03: Vehicle catalog, purchase, persistence, spawn
- [x] 04-04: Dealership teleports and temporary spawn command behavior

### Phase 5: Shops & casino

**Goal**: Weapon and clothing purchases persist; casino games accept bets and record outcomes.

**Depends on**: Phase 2

**Requirements**: WPN-01, WPN-02, CLTH-01, CLTH-02, CASI-01, CASI-02

**Success Criteria** (what must be TRUE):

1. Player can buy weapons at shops; loadout persists
2. Player can buy clothing; outfit persists
3. Slots and roulette commands work with balance updates and persistence

**Plans**: 3 plans

Plans:

- [x] 05-01: Weapon shop catalog, locations, persistence
- [x] 05-02: Clothing shop catalog, locations, persistence
- [x] 05-03: Casino bet validation, outcomes, and DB side effects

### Phase 6: World & webview

**Goal**: World markers, static vehicles, death/respawn rules, and core webview load correctly.

**Depends on**: Phase 1

**Requirements**: WORLD-01, WORLD-02, WORLD-03, WORLD-04, WEBV-01

**Success Criteria** (what must be TRUE):

1. Expected blips exist for shops, properties, hospitals, casino, dealerships
2. Static parked vehicles appear at configured coordinates
3. Death triggers hospital respawn with documented fee/timing
4. Ambient peds/traffic stay disabled for clean multiplayer
5. Vue webview builds and loads for in-game UI flows

**Plans**: 3 plans

Plans:

- [ ] 06-01: Blips + static vehicle registration review
- [ ] 06-02: Death/respawn and world cleanliness (no ambient population)
- [ ] 06-03: Webview build integration and smoke checks in client

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform & persistence | 3/3 | Complete    | 2026-04-05 |
| 2. Identity & economy | 3/3 | Complete    | 2026-04-05 |
| 3. Phone & messaging | 2/2 | Complete    | 2026-04-05 |
| 4. Properties & vehicles | 4/4 | Complete    | 2026-04-05 |
| 5. Shops & casino | 3/3 | Complete    | 2026-04-05 |
| 6. World & webview | 0/3 | Not started | - |

---

_Roadmap created: 2026-04-05_
