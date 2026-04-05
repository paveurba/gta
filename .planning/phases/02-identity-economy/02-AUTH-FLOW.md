# Auth flow (server reference)

**Phase:** 02 — Identity & economy  
**Source of truth:** `src/plugins/gta-mysql-core/server/events/registerAuthClientEvents.ts` (wired from `server/index.ts`), `AuthService.ts`

## Entry points

- **`alt.onClient('auth:register', ...)`** — UI sends username, email, password, confirmPassword.
- **`alt.onClient('auth:login', ...)`** — UI sends login identifier (email **or** username) and password.

Chat commands **`/register`** and **`/login`** do **not** perform registration/login. `handleCommand` returns the message: `Use the Auth menu (press T) to login or register.`

## Register path

1. `clearExistingSession(player)` — clears prior session, saves weapons/despawns vehicles if needed.
2. If `password !== confirmPassword` → `auth:registerResult` with `Password and confirmation do not match.`
3. `authService.register({ username, email, password })` — validates username/email/password, bcrypt-hashes password, `INSERT INTO players (...)`.
4. On failure → `auth:registerResult` with `result.message`.
5. On success → build `PlayerSession`: `oderId: result.session!.playerId`, `email`, `money`, `bank`.
6. `completeLogin(player, session)` — see **Session binding** below.
7. `auth:registerResult` success + chat `Registered! Cash: $...`

## Login path

1. `await getMySQLPool()` then `clearExistingSession(player)`.
2. `authService.login(loginIdentifier, password)`.
3. On failure → `auth:loginResult` with `success: false`, `result.message`.
4. On success → build `PlayerSession` from `result.session`.
5. If `passwordChangeRequired` (temporary password flow): `playerSessions.set`, `player.setMeta('playerId', ...)`, `auth:loginResult` with message `You must set a new password.` — **no** full `completeLogin` until password change.
6. Otherwise → `completeLogin(player, session)`, `auth:loginResult` success, `Welcome back!` notify.

## Session binding (`completeLogin`)

1. `playerSessions.set(player.id, session)`
2. `player.setMeta('playerId', session.oderId)`
3. `alt.emitClient(player, 'gta:playerId', session.oderId)`
4. `bindCharacterForPlayer(player, session.email)`
5. `spawnPlayerSafe(player)`
6. `applyCharacterLook(player, session.oderId)` — appearance + clothing from MySQL
7. `weaponService.loadWeaponsToPlayer(player, session.oderId)`
8. `syncMoneyToClient(player)`

## Logout

- **`alt.onClient('auth:logout', ...)`** — saves weapons, despawn vehicles, clears session, `gta:logout` to client.
- Chat **`/logout`** — same cleanup pattern in `handleCommand` (weapons save, `playerSessions.delete`, `gta:logout`).

## Related client events (reference)

- `auth:registerResult`, `auth:loginResult`, `auth:forgotPasswordResult`, `auth:changePasswordResult`
- `gta:playerId`, `gta:logout`, `gta:money:update`
