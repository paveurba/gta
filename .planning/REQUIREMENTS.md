# Requirements: GTA (alt:V Rebar server)

**Defined:** 2026-04-05
**Core Value:** Players can join the server, persist a character economy, and use the documented gameplay loops reliably against MySQL-backed state.

## v1 Requirements

Capabilities the server is expected to provide (baseline for verification and future work).

### Authentication

- [x] **AUTH-01**: User can register an account with username, email, and password via the **Auth UI** (press **T**)
- [x] **AUTH-02**: User can log in with **username or email** and password via the **Auth UI** (press **T**)
- [x] **AUTH-03**: Passwords are stored using bcrypt (hashed, not plaintext)
- [x] **AUTH-04**: Session ties player to persisted account for MySQL-backed features

### Economy

- [x] **ECON-01**: User can view cash and bank balance via chat
- [x] **ECON-02**: Money changes persist across reconnects (MySQL)

### Phone

- [x] **PHON-01**: User can add and list phone contacts via chat
- [x] **PHON-02**: User can send SMS-style messages to another player by id
- [x] **PHON-03**: User can open phone UI via documented hotkey

### Properties

- [x] **PROP-01**: User can list properties for sale and their own owned properties
- [x] **PROP-02**: User can buy an available property when near it (interaction)
- [x] **PROP-03**: User can enter and exit owned properties
- [x] **PROP-04**: User can sell an owned property
- [x] **PROP-05**: User can store vehicles in property garages up to slot limits

### Vehicles

- [x] **VEH-01**: User can list owned vehicles
- [x] **VEH-02**: User can spawn an owned vehicle by id
- [x] **VEH-03**: User can buy vehicles from dealerships (interaction / teleport helpers)
- [x] **VEH-04**: Vehicle ownership and attributes persist in MySQL
- [x] **VEH-05**: User can spawn a temporary debug vehicle via chat (where implemented)

### Weapons

- [ ] **WPN-01**: User can view weapon catalog and buy weapons at Ammu-Nation locations
- [ ] **WPN-02**: Owned weapons and ammo persist in MySQL

### Clothing

- [ ] **CLTH-01**: User can purchase clothing at configured shops
- [ ] **CLTH-02**: Outfit components persist in MySQL

### Casino

- [ ] **CASI-01**: User can play slots with a bet command
- [ ] **CASI-02**: User can play roulette with bet/type/value command

### World & UX

- [ ] **WORLD-01**: Map blips mark shops, properties, hospitals, casino, dealerships
- [ ] **WORLD-02**: Static parked vehicles spawn at configured world locations
- [ ] **WORLD-03**: On death, user respawns at nearest hospital with documented fee and delay
- [ ] **WORLD-04**: Ambient pedestrians and traffic remain disabled (multiplayer-clean world)

### Webview

- [ ] **WEBV-01**: In-game webview (Vue) loads for phone and related UI flows

### Operations

- [x] **OPS-01**: `docker compose` can start MySQL, MongoDB, and alt:V server with documented ports
- [x] **OPS-02**: MySQL schema is applied on fresh DB and migrations run on server start
- [x] **OPS-03**: Documented refresh path rebuilds TS/webview and restarts containers after code changes

## v2 Requirements

### Hardening

- **TEST-01**: Automated tests cover critical services or repositories
- **TEST-02**: CI runs compile and lint on push

### Email

- **MAIL-01**: Optional SMTP-based verification or notifications in production

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile client | Web + alt:V client only |
| Rockstar official Online sync | Independent server |
| Real-money gambling | Gameplay currency only |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OPS-01 | Phase 1 | Complete |
| OPS-02 | Phase 1 | Complete |
| OPS-03 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| ECON-01 | Phase 2 | Complete |
| ECON-02 | Phase 2 | Complete |
| PHON-01 | Phase 3 | Complete |
| PHON-02 | Phase 3 | Complete |
| PHON-03 | Phase 3 | Complete |
| PROP-01 | Phase 4 | Complete |
| PROP-02 | Phase 4 | Complete |
| PROP-03 | Phase 4 | Complete |
| PROP-04 | Phase 4 | Complete |
| PROP-05 | Phase 4 | Complete |
| VEH-01 | Phase 4 | Complete |
| VEH-02 | Phase 4 | Complete |
| VEH-03 | Phase 4 | Complete |
| VEH-04 | Phase 4 | Complete |
| VEH-05 | Phase 4 | Complete |
| WPN-01 | Phase 5 | Pending |
| WPN-02 | Phase 5 | Pending |
| CLTH-01 | Phase 5 | Pending |
| CLTH-02 | Phase 5 | Pending |
| CASI-01 | Phase 5 | Pending |
| CASI-02 | Phase 5 | Pending |
| WORLD-01 | Phase 6 | Pending |
| WORLD-02 | Phase 6 | Pending |
| WORLD-03 | Phase 6 | Pending |
| WORLD-04 | Phase 6 | Pending |
| WEBV-01 | Phase 6 | Pending |

**Coverage:**

- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---

_Requirements defined: 2026-04-05_
_Last updated: 2026-04-05 after roadmap creation_
