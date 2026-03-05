# Track 4 - QA Plan and Report Template

## Preconditions

1. Copy `.env.example` to `.env`.
2. Start stack: `docker compose up --build -d`.
3. Ensure MySQL is healthy and alt server is running.

## Manual Test Cases

1. Registration happy path
- Step: connect player, run `/register test@example.com pass1234`
- Expected: success message, player spawned, user row created.

2. Duplicate registration
- Step: run `/register test@example.com pass1234` again
- Expected: `User already exists`.

3. Login success
- Step: reconnect player, run `/login test@example.com pass1234`
- Expected: `Login successful`, player spawned.

4. Login invalid password
- Step: run `/login test@example.com wrongpass`
- Expected: `Invalid credentials`.

5. Auth guard for vehicle command
- Step: without login, run `/veh sultan`
- Expected: login required message.

6. Vehicle spawn after login
- Step: login then run `/veh sultan`
- Expected: vehicle spawned and inserted into `player_vehicles`.

7. Inventory read
- Step: run `/inv`
- Expected: empty message or formatted item list.

8. Job set/get
- Step: `/job taxi` then `/job`
- Expected: active job set and returned correctly.

## SQL Verification Queries

1. `SELECT id, email, last_login_at FROM users ORDER BY id DESC LIMIT 5;`
2. `SELECT user_id, model, created_at FROM player_vehicles ORDER BY id DESC LIMIT 10;`
3. `SELECT user_id, item_name, quantity FROM inventory_items ORDER BY id DESC LIMIT 10;`
4. `SELECT user_id, job_name, is_active FROM player_jobs ORDER BY id DESC LIMIT 10;`

## QA Report Template

- Build/version: 
- Environment: 
- Tester: 
- Date: 
- Result summary: Pass/Fail
- Failed cases:
- Logs/evidence:
- Retest status:
