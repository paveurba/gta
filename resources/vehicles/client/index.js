import * as alt from "alt-client";
import * as native from "natives";

const SPAWN_RADIUS  = 3.0;  // metres to show "press U to spawn" prompt
const DEALER_RADIUS = 6.0;

let ownedVehicles        = [];
let catalog              = [];
let dealerPos            = null;
let spawnedEntityId      = null; // server entity ID of our spawned vehicle
let spawnedDbId          = null;
let nearVehicleId        = null; // db id of parked vehicle we're standing near
let dealerMenuOpen       = false;
let notifText            = null;
let notifExpiry          = 0;
let tickId               = null;
const vehicleBlips       = [];
let dealerBlip           = null;

// ── Server events ─────────────────────────────────────────────────────────────
alt.onServer("vehicles:list", (vehicles, cat, dealer) => {
  ownedVehicles = vehicles ?? [];
  catalog       = cat      ?? [];
  dealerPos     = dealer;
  updateBlips();
  if (!tickId) tickId = alt.everyTick(onTick);
});

alt.onServer("vehicle:spawned", (entityId, dbId) => {
  spawnedEntityId = entityId;
  spawnedDbId     = dbId;
  updateBlips();
});

alt.onServer("vehicle:parked", () => {
  spawnedEntityId = null;
  spawnedDbId     = null;
  updateBlips();
});

alt.onServer("vehicle:notify", (msg) => {
  dealerMenuOpen = false;
  showNotif(msg);
});

// ── Key handling ──────────────────────────────────────────────────────────────
alt.on("keydown", (key) => {
  if (dealerMenuOpen) {
    if (key === 27) { dealerMenuOpen = false; return; } // ESC
    if (key >= 49 && key <= 57) {
      const idx = key - 49;
      if (idx < catalog.length) { alt.emitServer("vehicle:buy", idx); dealerMenuOpen = false; }
    }
    return;
  }

  const pos     = alt.Player.local.pos;
  const inMine  = isInMyVehicle();
  const atDealer = dealerPos && dist3(pos, dealerPos.x, dealerPos.y, dealerPos.z) < DEALER_RADIUS;

  if (key === 69 && atDealer && !spawnedEntityId) { // E at dealership
    dealerMenuOpen = true;
    return;
  }
  if (key === 85) { // U — spawn or park
    if (inMine) {
      alt.emitServer("vehicle:park");
    } else if (nearVehicleId) {
      alt.emitServer("vehicle:spawn", nearVehicleId);
    }
    return;
  }
  if (key === 76 && inMine) { // L — lock
    alt.emitServer("vehicle:lock");
  }
});

// ── Every-tick UI ─────────────────────────────────────────────────────────────
function onTick() {
  const pos    = alt.Player.local.pos;
  nearVehicleId = null;

  if (dealerMenuOpen) {
    drawDealerMenu();
    return;
  }

  const inMine   = isInMyVehicle();
  const atDealer = dealerPos && dist3(pos, dealerPos.x, dealerPos.y, dealerPos.z) < DEALER_RADIUS;

  if (inMine) {
    drawText("~b~[U]~w~ Park   ~b~[L]~w~ Lock/Unlock", 0.5, 0.9, 0.38);
  } else if (atDealer && !spawnedEntityId) {
    drawText("~w~Press ~b~[E]~w~ to browse vehicles", 0.5, 0.9, 0.40);
  } else if (!spawnedEntityId) {
    for (const v of ownedVehicles) {
      if (dist3(pos, v.stored_x, v.stored_y, v.stored_z) < SPAWN_RADIUS) {
        nearVehicleId = v.id;
        drawText(`~w~Press ~b~[U]~w~ to spawn ~y~${v.model.toUpperCase()}~w~ · ${v.plate}`, 0.5, 0.9, 0.40);
        break;
      }
    }
  }

  if (notifText && Date.now() < notifExpiry) {
    drawText(notifText, 0.5, 0.85, 0.38);
  }
}

function drawDealerMenu() {
  native.drawRect(0.5, 0.5, 1.0, 1.0, 0, 0, 0, 160, false);
  drawText("~y~PREMIUM DELUXE MOTORSPORT", 0.5, 0.10, 0.65);
  drawText("~s~Press number to buy · ESC to close", 0.5, 0.18, 0.34);
  let y = 0.27;
  for (let i = 0; i < catalog.length && i < 9; i++) {
    const c = catalog[i];
    drawText(`~b~[${i + 1}]~w~  ${c.label}  ~g~$${c.price.toLocaleString()}`, 0.5, y, 0.42);
    y += 0.068;
  }
}

// ── Blips ─────────────────────────────────────────────────────────────────────
function updateBlips() {
  vehicleBlips.forEach(b => b.destroy());
  vehicleBlips.length = 0;

  for (const v of ownedVehicles) {
    if (v.id === spawnedDbId) continue; // hide blip for currently-spawned vehicle
    const b = new alt.PointBlip(v.stored_x, v.stored_y, v.stored_z);
    b.sprite     = 225; // car icon
    b.color      = 3;   // blue
    b.name       = `${v.model.toUpperCase()} (${v.plate})`;
    b.shortRange = true;
    b.scale      = 0.8;
    vehicleBlips.push(b);
  }

  if (!dealerBlip && dealerPos) {
    dealerBlip = new alt.PointBlip(dealerPos.x, dealerPos.y, dealerPos.z);
    dealerBlip.sprite     = 225;
    dealerBlip.color      = 5; // yellow
    dealerBlip.name       = "Premium Deluxe Motorsport";
    dealerBlip.shortRange = false;
    dealerBlip.scale      = 1.1;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isInMyVehicle() {
  if (spawnedEntityId == null) return false;
  const localVeh = alt.Player.local.vehicle;
  if (!localVeh) return false;
  return localVeh.id === spawnedEntityId;
}

function showNotif(msg, ms = 6000) { notifText = msg; notifExpiry = Date.now() + ms; }

function dist3(pos, x, y, z) {
  const dx = pos.x - x, dy = pos.y - y, dz = pos.z - z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function drawText(text, x, y, scale) {
  native.setTextFont(4);
  native.setTextScale(0, scale);
  native.setTextColour(255, 255, 255, 255);
  native.setTextCentre(true);
  native.setTextOutline();
  native.beginTextCommandDisplayText("STRING");
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(x, y);
}
