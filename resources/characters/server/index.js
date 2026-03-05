import * as alt from "alt-server";
import * as db from "alt:database";

const MAX_SLOTS = 2;
const DEFAULT_SPAWN = { x: -269.0, y: -956.7, z: 31.2, heading: 0 };

// player.id -> character row (active character per player)
const active = new Map();

// Wait until the database resource has initialized
async function waitForDb(timeoutMs = 15000) {
  if (db.isReady()) return;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DB timeout")), timeoutMs);
    alt.once("database:Ready", () => { clearTimeout(timer); resolve(); });
  });
}

// --- Connect: spawn at temp position so client native draws work, then show character list ---
alt.on("playerConnect", async (player) => {
  try {
    await waitForDb();
    const rows = await db.query(
      "SELECT id, slot, name, sex, created_at FROM characters WHERE account = ? ORDER BY slot",
      [player.name]
    );
    // Spawn at default location first so the client is in-game and native HUD draws render
    player.spawn(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z, 0);
    alt.emitClient(player, "characters:show", rows, MAX_SLOTS);
  } catch (e) {
    alt.logError("[characters] playerConnect failed:", e);
    alt.emitClient(player, "characters:error", "Server error. Please reconnect.");
  }
});

// --- Client selects existing character ---
alt.onClient("characters:select", async (player, charId) => {
  if (active.has(player.id)) return; // already spawned
  try {
    const [char] = await db.query(
      "SELECT * FROM characters WHERE id = ? AND account = ?",
      [charId, player.name]
    );
    if (!char) { alt.logWarning(`[characters] Invalid charId ${charId} for ${player.name}`); return; }
    spawnCharacter(player, char);
  } catch (e) {
    alt.logError("[characters] select failed:", e);
  }
});

// --- Client creates new character ---
alt.onClient("characters:create", async (player, name, sex) => {
  if (active.has(player.id)) return;
  name = String(name ?? "").trim().replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
  if (name.length < 3) { alt.emitClient(player, "characters:error", "Name must be at least 3 letters."); return; }
  sex = sex === 1 ? 1 : 0;

  try {
    const existing = await db.query("SELECT slot FROM characters WHERE account = ? ORDER BY slot", [player.name]);
    if (existing.length >= MAX_SLOTS) { alt.emitClient(player, "characters:error", "Max characters reached."); return; }
    const slot = existing.length;
    const appearance = { ...db.DEFAULT_APPEARANCE, sex, overlays: db.DEFAULT_APPEARANCE.overlays.map(o => ({ ...o })) };
    await db.query(
      "INSERT INTO characters (account, slot, name, sex, x, y, z, heading, appearance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [player.name, slot, name, sex, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z, DEFAULT_SPAWN.heading, JSON.stringify(appearance)]
    );
    const [char] = await db.query("SELECT * FROM characters WHERE account = ? AND slot = ?", [player.name, slot]);
    spawnCharacter(player, char);
  } catch (e) {
    alt.logError("[characters] create failed:", e);
    alt.emitClient(player, "characters:error", "Failed to create character.");
  }
});

// --- Spawn a player with the given character row ---
function spawnCharacter(player, char) {
  active.set(player.id, char);
  player.spawn(char.x, char.y, char.z, 0);
  player.heading = char.heading ?? 0;
  player.health = Math.max(100, Number(char.health ?? 200));
  player.armour = Number(char.armour ?? 0);
  player.setMeta("charId", char.id);
  player.setMeta("money", Number(char.cash ?? 5000));

  const appearance = typeof char.appearance === "string"
    ? JSON.parse(char.appearance)
    : (char.appearance ?? {});
  db.applyAppearance(player, appearance);

  alt.emitClient(player, "characters:spawned");
  alt.emit("character:spawned", player, char); // hook for other resources
  alt.log(`[characters] ${player.name} spawned as "${char.name}" (id=${char.id})`);
}

// --- Disconnect: save character state ---
alt.on("playerDisconnect", async (player) => {
  const char = active.get(player.id);
  active.delete(player.id);
  if (!char) return;

  try {
    await db.query(
      `UPDATE characters
       SET health=?, armour=?, cash=?, x=?, y=?, z=?, heading=?, updated_at=CURRENT_TIMESTAMP(3)
       WHERE id=?`,
      [
        player.health,
        player.armour,
        player.getMeta("money") ?? char.cash,
        player.pos.x, player.pos.y, player.pos.z,
        player.heading,
        char.id,
      ]
    );
  } catch (e) {
    alt.logError("[characters] save on disconnect failed:", e);
  }
});

// Expose active character for other resources
export function getActiveCharacter(player) {
  return active.get(player.id) ?? null;
}

alt.log("[characters] Resource loaded.");
