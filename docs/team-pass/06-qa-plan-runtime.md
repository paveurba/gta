# QA Plan - Runtime Connection and Gameplay Smoke

Date: 2026-03-05
Branch: rebar-rewrite

## Objective

Validate that players can connect, spawn above ground, and use gameplay functions even when chat/F-key input is unreliable.

## Preconditions

1. Pull latest `rebar-rewrite`.
2. Start stack: `docker compose up -d --build`.
3. Confirm server logs include:
   - `Plugin initialized`
   - `Plugins Loaded`
   - `Server Started Successfully`
   - `MySQL connection OK`

## Test Cases

1. Connection stability
- Action: connect from alt:V client to `192.168.31.84:7788`
- Expected: client reaches world (not disconnected during resource load)

2. Spawn position
- Action: connect and wait 3-5 seconds
- Expected: player appears near Mission Row (`425.1, -979.5, 30.7`), not below map
- Expected: if a client briefly appears below map, auto-recovery teleports to safe ground in <= 3 seconds

3. Auto auth fallback
- Action: after connect, wait 2-5 seconds
- Expected: notification about auto-register or auto-login

4. Hotkey auth fallback
- Action: press `F5` then `F6`
- Expected: notifications visible in feed; no errors

5. Vehicle test
- Action: press `F7`
- Expected: `sultan` spawns and player enters vehicle

6. Inventory and jobs test
- Action: press `F8`, then `F9` twice
- Expected: inventory message, then `taxi` set/get message

7. Database persistence
- Action: run SQL checks after gameplay actions
- Commands:
  - `SELECT id,email,last_login_at FROM users ORDER BY id DESC LIMIT 5;`
  - `SELECT user_id,model FROM player_vehicles ORDER BY id DESC LIMIT 10;`
  - `SELECT user_id,job_name,is_active FROM player_jobs ORDER BY id DESC LIMIT 10;`
- Expected: records are present for latest test player

## Evidence to Capture

- Client log from `Connect ...` until world load complete.
- `docker compose logs --tail=300 altv-server`.
- SQL query outputs.

## Pass Criteria

- Connection succeeds without core resource failure.
- Spawn is above ground.
- At least one auth path works (auto or hotkey).
- Vehicle/job DB writes confirmed.
