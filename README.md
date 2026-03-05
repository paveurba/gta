# GTA 5 alt:V MP Server (Docker)

Docker setup for an **alt:V** multiplayer server (GTA 5). Uses the official [altmp/altv-server](https://hub.docker.com/r/altmp/altv-server) image.

## Quick start

```bash
# Build and run game server only
docker compose up -d

# Or build and run in foreground (see logs)
docker compose up --build
```

Server listens on **7788** (TCP + UDP). The server is **not** on the public list (`announce = false`). Connect like this:

1. Open the [alt:V client](https://altv.mp/#/downloads).
2. Use **Direct Connect** (not the server browser).
3. **Host:** `127.0.0.1` (same machine) or your Mac’s LAN IP (e.g. `192.168.x.x`) if connecting from another PC.
4. **Port:** `7788`.
5. Client branch must match server (use **release**).

## Build only

```bash
docker compose build
# or
docker build -t gta-altv-server .
```

## Money and MySQL (persistence)

MySQL connection follows the **alt:V community pattern** (see [mysql2-wrapper](https://github.com/nickplayz/mysql2-wrapper)):

- **Connection:** Use a URI `mysql://user:password@host:port/database?charset=utf8mb4` or set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` (Docker env).
- **When DB is ready:** The resource emits `database:Ready`. Wait for it before running queries:

```js
alt.on("database:Ready", () => {
  // MySQL is connected and tables are ready
});
```

- **Without MySQL:** Server still runs; each player gets default money (5000) in memory.
- **With MySQL:** Start with the `db` profile:

```bash
cp .env.example .env
docker compose --profile db up -d
```

The **database** resource creates `players` (name, money) and `config` (key, value). Other resources:

```js
import * as db from "alt:database";

await db.getMoney(player);
await db.setMoney(player, 10000);
await db.getConfig("key");
await db.setConfig("key", value);
```

Add `deps = ["database"]` in your `resource.toml`. The **example** resource shows money on connect (F8: “Your money: $…”).

**Check if MySQL is loaded:** After a player connects, check server logs:
- `[database] MySQL connected, tables ready (database:Ready emitted).` = MySQL OK.
- `[database] MySQL init failed: ...` = DB not reachable (start with `--profile db` or check MYSQL_* env).

## No cars / no peds (empty world)

The **world** resource turns GTA’s ambient traffic and peds back on (they’re off in multiplayer by default) using client natives every frame. If you still see no cars or peds:

1. **Clear client cache:** alt:V → Settings → your server under “Server data” → **Delete resources** → reconnect.
2. **Confirm world is loaded:** In server logs you should see `Loaded resource world`.
3. **Client branch:** Use **release** to match the server.

## Run with voice server

1. Copy env example and set your public IP and secret:
   ```bash
   cp .env.example .env
   # Edit .env: PUBLIC_IP=your.public.ip, VOICE_SECRET=1234567890
   ```
2. In `docker-compose.yml`, uncomment `depends_on: - altv-voice` under `altv-server`.
3. In `server.toml`, uncomment the `[voice]` block and set `externalPublicHost` to your public IP.
4. Start with voice profile:
   ```bash
   docker compose --profile voice up -d
   ```

## Mac / Docker Desktop (M-series, 24GB RAM)

The server has **no container limits** and an 8GB memory reservation. To avoid the process being killed or throttled:

1. **Docker Desktop → Settings → Resources → Memory** – set to **12 GB** or more (your Mac has 24 GB, so 12 GB for Docker is safe).
2. Apply & Restart, then run `docker compose up --build` again.

That gives the alt:V server enough room inside the Docker VM.

## Configuration

- **File-based:** Edit `server.toml`. Default is file-based (`ALTV_USE_ENV_CONFIG=false`).
- **Env-based:** Set `ALTV_USE_ENV_CONFIG=true` in `.env` and use `ALTV_*` variables (e.g. `ALTV_NAME`, `ALTV_PLAYERS`). See [altv-docker config](https://github.com/altmp/altv-docker).

## "Texture not loaded" / client loading (official docs)

That message appears in the **game client**, not in Docker logs. Server config is already set for proper streaming and optional props. On the **player PC**:

1. **Delete cached server resources** (often fixes bad/corrupt downloads):
   - In alt:V main menu → **Settings** → find your server under **Server data** → click **Delete resources** for it, then reconnect.

2. **Client config** (alt:V install folder → `altv.toml`). Ensure these exist (per [client config](https://docs.altv.mp/articles/configs/client.html)):
   - `textureBudgetPatch = true`
   - `useSharedTextures = true`
   - `heapSize = 2048` (or higher if you have VRAM; default 1024 = texture/asset VRAM budget)

3. **Enough free disk space** where alt:V is installed (client FAQ).

4. Server runs **without a CDN** (warning in logs). For local/dev that’s fine; for many players consider a CDN so resources load reliably.

## Resources

- **database** – MySQL persistence for player money and key-value config. Loads first; use `deps = ["database"]` in other resources and `import * as db from "alt:database"`.
- **world** – Enables standard GTA behavior: ambient traffic, peds, parked cars, and default interiors (IPLs).
- **example** – Minimal client/server script; shows money from database on connect (F8: “Your money: $…”).

Put custom resources in `resources/` and list them in `server.toml` under `resources = ["database", "world", "example", "your-resource"]`. The image includes **js-module** and **csharp-module**.

## Links

- [alt:V](https://altv.mp)
- [Server config](https://docs.altv.mp/articles/configs/server.html)
- [Docker image](https://hub.docker.com/r/altmp/altv-server)
