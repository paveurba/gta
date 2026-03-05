import * as alt from "alt-server";
import * as db from "alt:database";

// Dealership location (Premium Deluxe Motorsport, Pillbox Hill)
const DEALERSHIP = { x: -45.4, y: -1097.0, z: 26.4 };

const CATALOG = [
  { model: "sultan",    label: "Sultan",              price:  45000 },
  { model: "elegy2",   label: "Elegy RH8",            price:  35000 },
  { model: "banshee",  label: "Banshee",              price:  55000 },
  { model: "kuruma",   label: "Karin Kuruma",         price:  60000 },
  { model: "zentorno", label: "Zentorno",             price: 125000 },
  { model: "infernus", label: "Infernus Classic",     price:  95000 },
  { model: "adder",    label: "Adder",                price: 220000 },
  { model: "taxi",     label: "Taxi",                 price:  12000 },
  { model: "bifta",    label: "Bifta (Off-road)",     price:  18000 },
];

// charId -> { vehicle: alt.Vehicle, dbId }
const spawned = new Map();

// ── Send vehicle list when character spawns ───────────────────────────────────
alt.on("character:spawned", async (player, char) => {
  const vehicles = await db.query(
    "SELECT id, model, plate, color1, color2, stored_x, stored_y, stored_z, stored_heading FROM owned_vehicles WHERE character_id = ?",
    [char.id]
  );
  alt.emitClient(player, "vehicles:list", vehicles, CATALOG, DEALERSHIP);
});

// ── Spawn owned vehicle ───────────────────────────────────────────────────────
alt.onClient("vehicle:spawn", async (player, dbId) => {
  const charId = player.getMeta("charId");
  if (!charId) return;
  if (spawned.has(charId)) {
    alt.emitClient(player, "vehicle:notify", "Park your current vehicle first.");
    return;
  }
  const [row] = await db.query(
    "SELECT * FROM owned_vehicles WHERE id = ? AND character_id = ?",
    [dbId, charId]
  );
  if (!row) return;

  const v = new alt.Vehicle(row.model, row.stored_x, row.stored_y, row.stored_z + 0.5, 0, 0, row.stored_heading);
  v.numberPlateText = row.plate;
  v.primaryColor    = row.color1;
  v.secondaryColor  = row.color2;
  v.bodyHealth      = row.body_health;
  v.engineHealth    = row.engine_health;
  v.lockState       = 1; // unlocked

  spawned.set(charId, { vehicle: v, dbId: row.id });
  player.setIntoVehicle(v, 1);

  alt.emitClient(player, "vehicle:spawned", v.id, row.id);
  alt.log(`[vehicles] ${player.name} spawned ${row.model} (${row.plate})`);
});

// ── Park vehicle (save position + despawn) ────────────────────────────────────
alt.onClient("vehicle:park", async (player) => {
  const charId = player.getMeta("charId");
  if (!charId || !spawned.has(charId)) return;

  const { vehicle, dbId } = spawned.get(charId);
  if (!vehicle.valid) { spawned.delete(charId); return; }

  await db.query(
    `UPDATE owned_vehicles
     SET stored_x=?, stored_y=?, stored_z=?, stored_heading=?,
         body_health=?, engine_health=?, updated_at=CURRENT_TIMESTAMP(3)
     WHERE id=?`,
    [vehicle.pos.x, vehicle.pos.y, vehicle.pos.z, vehicle.heading,
     vehicle.bodyHealth, vehicle.engineHealth, dbId]
  );
  vehicle.destroy();
  spawned.delete(charId);

  // Refresh client blips with updated stored position
  const vehicles = await db.query(
    "SELECT id, model, plate, color1, color2, stored_x, stored_y, stored_z, stored_heading FROM owned_vehicles WHERE character_id = ?",
    [charId]
  );
  alt.emitClient(player, "vehicles:list", vehicles, CATALOG, DEALERSHIP);
  alt.emitClient(player, "vehicle:parked");
});

// ── Lock / unlock ─────────────────────────────────────────────────────────────
alt.onClient("vehicle:lock", (player) => {
  const charId = player.getMeta("charId");
  if (!charId || !spawned.has(charId)) return;
  const { vehicle } = spawned.get(charId);
  if (!vehicle.valid) return;
  vehicle.lockState = vehicle.lockState === 2 ? 1 : 2;
  alt.emitClient(player, "vehicle:notify", vehicle.lockState === 2 ? "Vehicle locked." : "Vehicle unlocked.");
});

// ── Buy from dealership ───────────────────────────────────────────────────────
alt.onClient("vehicle:buy", async (player, catalogIndex) => {
  const charId = player.getMeta("charId");
  if (!charId || catalogIndex < 0 || catalogIndex >= CATALOG.length) return;

  const item  = CATALOG[catalogIndex];
  const money = player.getMeta("money") ?? 0;
  if (money < item.price) { alt.emitClient(player, "vehicle:notify", "Not enough money."); return; }

  // Generate unique plate
  let plate, attempts = 0;
  do {
    plate = genPlate();
    const [exists] = await db.query("SELECT id FROM owned_vehicles WHERE plate = ?", [plate]);
    if (!exists) break;
    if (++attempts > 20) { alt.emitClient(player, "vehicle:notify", "Could not generate plate. Try again."); return; }
  } while (true);

  await db.setMoney(player, money - item.price);
  await db.query(
    "INSERT INTO owned_vehicles (character_id, model, plate, stored_x, stored_y, stored_z, stored_heading) VALUES (?,?,?,?,?,?,?)",
    [charId, item.model, plate, DEALERSHIP.x + 5, DEALERSHIP.y, DEALERSHIP.z, 0]
  );

  const vehicles = await db.query(
    "SELECT id, model, plate, color1, color2, stored_x, stored_y, stored_z, stored_heading FROM owned_vehicles WHERE character_id = ?",
    [charId]
  );
  alt.emitClient(player, "vehicles:list", vehicles, CATALOG, DEALERSHIP);
  alt.emitClient(player, "vehicle:notify", `Purchased ${item.label} for $${item.price.toLocaleString()}!  Plate: ${plate}`);
  alt.log(`[vehicles] char ${charId} bought ${item.model} (${plate})`);
});

// ── Cleanup vehicle entity on destroyed ──────────────────────────────────────
alt.on("vehicleDestroy", (vehicle) => {
  for (const [charId, data] of spawned.entries()) {
    if (data.vehicle === vehicle) { spawned.delete(charId); break; }
  }
});

// ── Save + despawn on disconnect ──────────────────────────────────────────────
alt.on("playerDisconnect", async (player) => {
  const charId = player.getMeta("charId");
  if (!charId || !spawned.has(charId)) return;
  const { vehicle, dbId } = spawned.get(charId);
  spawned.delete(charId);
  if (!vehicle.valid) return;
  await db.query(
    `UPDATE owned_vehicles SET stored_x=?, stored_y=?, stored_z=?, stored_heading=?,
     body_health=?, engine_health=?, updated_at=CURRENT_TIMESTAMP(3) WHERE id=?`,
    [vehicle.pos.x, vehicle.pos.y, vehicle.pos.z, vehicle.heading,
     vehicle.bodyHealth, vehicle.engineHealth, dbId]
  ).catch(() => {});
  vehicle.destroy();
});

function genPlate() {
  const c = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  return Array.from({ length: 7 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}

export { CATALOG, DEALERSHIP };
alt.log("[vehicles] Resource loaded.");
