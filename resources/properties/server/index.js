import * as alt from "alt-server";
import * as db from "alt:database";

// player.id -> propertyId the player is currently inside
const insideProperty = new Map();
let seeded = false;

async function seedProperties() {
  // label, type, price, enter_x, enter_y, enter_z, enter_h, exit_x, exit_y, exit_z, exit_h, ipl
  const rows = [
    ["Sandy Shores Trailer",   "house",       25000,   2622.0,  3432.0,  54.7, 180,   2623.5,  3432.0,  55.0,   0, null],
    ["Paleto Bay Cottage",     "house",       35000,   -247.0,  6325.0,  31.0,  90,   -245.0,  6325.0,  31.0, 270, null],
    ["Strawberry Apartment",   "apartment",   80000,     75.0, -1924.0,  20.7,  90,     77.5, -1922.0,  21.0, 270, null],
    ["Vinewood Hills House",   "house",      250000,   -179.0,   497.0, 136.8, 220,   -177.0,   495.5, 137.0,  40, null],
    ["Rockford Hills Mansion", "house",     1000000,   -752.0,   602.0, 132.3, 180,   -750.0,   600.5, 132.5,   0, null],
  ];
  for (const r of rows) {
    await db.query(
      "INSERT INTO properties (label,type,price,enter_x,enter_y,enter_z,enter_heading,exit_x,exit_y,exit_z,exit_heading,ipl) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      r
    );
  }
  alt.log("[properties] Seeded 5 default properties.");
}

// ── Send property list when character spawns ─────────────────────────────────
alt.on("character:spawned", async (player, char) => {
  if (!seeded) {
    const [{ cnt }] = await db.query("SELECT COUNT(*) as cnt FROM properties");
    if (Number(cnt) === 0) await seedProperties();
    seeded = true;
  }
  const rows = await db.query("SELECT * FROM properties");
  alt.emitClient(player, "properties:list", rows, char.id);
});

// ── Player interacts with property (E key) ────────────────────────────────────
alt.onClient("property:interact", async (player, propId) => {
  const charId = player.getMeta("charId");
  if (!charId) return;

  const [prop] = await db.query("SELECT * FROM properties WHERE id = ?", [propId]);
  if (!prop) return;

  const isInside = insideProperty.get(player.id) === propId;

  if (isInside) {
    // Exit → teleport back to entrance
    insideProperty.delete(player.id);
    player.pos = new alt.Vector3(prop.enter_x, prop.enter_y, prop.enter_z);
    player.heading = prop.enter_heading;
    alt.emitClient(player, "property:exited", prop.ipl ?? null);
    return;
  }

  if (prop.owner_char_id === charId) {
    // Owner enters
    insideProperty.set(player.id, propId);
    player.pos = new alt.Vector3(prop.exit_x, prop.exit_y, prop.exit_z);
    player.heading = prop.exit_heading;
    alt.emitClient(player, "property:entered", prop.ipl ?? null, propId);
  } else if (!prop.owner_char_id) {
    // For sale — send buy prompt to client
    alt.emitClient(player, "property:buyPrompt", propId, prop.label, Number(prop.price));
  }
});

// ── Buy ───────────────────────────────────────────────────────────────────────
alt.onClient("property:buy", async (player, propId) => {
  const charId = player.getMeta("charId");
  if (!charId) return;

  const [prop] = await db.query("SELECT * FROM properties WHERE id = ? AND owner_char_id IS NULL", [propId]);
  if (!prop) { alt.emitClient(player, "property:notify", "Property no longer available."); return; }

  const price = Number(prop.price);
  const money = player.getMeta("money") ?? 0;
  if (money < price) { alt.emitClient(player, "property:notify", "Not enough money."); return; }

  await db.setMoney(player, money - price);
  await db.query("UPDATE properties SET owner_char_id = ? WHERE id = ?", [charId, propId]);

  const rows = await db.query("SELECT * FROM properties");
  alt.emitClient(player, "properties:list", rows, charId);
  alt.emitClient(player, "property:notify", `You bought ${prop.label}!`);
  alt.log(`[properties] char ${charId} bought "${prop.label}" for $${price}`);
});

// ── Cleanup on disconnect ─────────────────────────────────────────────────────
alt.on("playerDisconnect", (player) => { insideProperty.delete(player.id); });

// Export for other resources
export async function getPlayerProperties(charId) {
  return db.query("SELECT * FROM properties WHERE owner_char_id = ?", [charId]);
}

alt.log("[properties] Resource loaded.");
