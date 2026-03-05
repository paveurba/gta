import * as alt from "alt-client";
import * as native from "natives";

const RADIUS = 2.5; // metres to trigger interaction prompt

let properties   = [];
let myCharId     = null;
let insidePropId = null;   // which property we're currently inside
let nearPropId   = null;   // which property entrance we're standing near
let buyPropId    = null;   // pending buy confirmation
let buyPropLabel = "";
let buyPropPrice = 0;
let notifText    = null;
let notifExpiry  = 0;
let tickId       = null;
const blips      = [];

// ── Server events ─────────────────────────────────────────────────────────────
alt.onServer("properties:list", (props, charId) => {
  properties = props ?? [];
  myCharId   = charId;
  updateBlips();
  if (!tickId) tickId = alt.everyTick(onTick);
});

alt.onServer("property:entered", (ipl, propId) => {
  if (ipl) native.requestIpl(ipl);
  insidePropId = propId;
  nearPropId   = null;
  buyPropId    = null;
});

alt.onServer("property:exited", (ipl) => {
  if (ipl) native.removeIpl(ipl);
  insidePropId = null;
});

alt.onServer("property:buyPrompt", (propId, label, price) => {
  buyPropId    = propId;
  buyPropLabel = label;
  buyPropPrice = price;
  showNotif(`Buy ~g~${label}~w~ for ~y~$${price.toLocaleString()}~w~?  [~b~Y~w~] Yes   [~b~N~w~] No`);
});

alt.onServer("property:notify", (msg) => {
  buyPropId = null;
  showNotif(msg);
});

// ── Key handling ──────────────────────────────────────────────────────────────
alt.on("keydown", (key) => {
  if (key === 69) { // E — enter / exit / trigger buy
    if (insidePropId != null) {
      alt.emitServer("property:interact", insidePropId);
    } else if (nearPropId != null) {
      alt.emitServer("property:interact", nearPropId);
    }
  }
  if (key === 89 && buyPropId != null) { // Y — confirm buy
    alt.emitServer("property:buy", buyPropId);
    buyPropId = null;
  }
  if (key === 78 && buyPropId != null) { // N — cancel buy
    buyPropId = null;
    notifText  = null;
  }
});

// ── Every-tick UI ─────────────────────────────────────────────────────────────
function onTick() {
  const pos = alt.Player.local.pos;
  nearPropId = null;

  if (insidePropId != null) {
    drawText("~w~Press ~b~[E]~w~ to exit property", 0.5, 0.9, 0.40);
  } else {
    for (const p of properties) {
      if (dist3(pos, p.enter_x, p.enter_y, p.enter_z) < RADIUS) {
        nearPropId = p.id;
        if (p.owner_char_id === myCharId) {
          drawText(`~w~Press ~b~[E]~w~ to enter ~y~${p.label}`, 0.5, 0.9, 0.40);
        } else if (!p.owner_char_id) {
          drawText(`~w~Press ~b~[E]~w~ to buy ~g~${p.label}~w~ · ~y~$${Number(p.price).toLocaleString()}`, 0.5, 0.9, 0.40);
        }
        break;
      }
    }
  }

  if (notifText && Date.now() < notifExpiry) {
    drawText(notifText, 0.5, 0.85, 0.38);
  }
}

// ── Blips ─────────────────────────────────────────────────────────────────────
function updateBlips() {
  blips.forEach(b => b.destroy());
  blips.length = 0;
  for (const p of properties) {
    if (p.owner_char_id && p.owner_char_id !== myCharId) continue; // hide others' properties
    const b = new alt.PointBlip(p.enter_x, p.enter_y, p.enter_z);
    b.sprite    = 40;  // house icon
    b.color     = p.owner_char_id === myCharId ? 2 : 66; // green=owned, yellow=for sale
    b.name      = p.owner_char_id === myCharId ? `🏠 ${p.label}` : `${p.label} ($${Number(p.price).toLocaleString()})`;
    b.shortRange = true;
    b.scale     = 0.8;
    blips.push(b);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
