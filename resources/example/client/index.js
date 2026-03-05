// Client - HUD, shops, properties (enter/exit), wanted, phone
import * as alt from "alt-client";
import * as native from "natives";

alt.log("[example] CLIENT LOADED");

let money = 0;
let wanted = 0;
let isDead = false;
let properties = [];
let ownedProperties = [];
let blipsCreated = false;
let insideProperty = null; // Currently inside this property

// UI states
let activeMenu = null;
let selectedIndex = 0;
let taxiLocations = [];

// Locations
const LOCS = {
  hotel: { x: -269.0, y: -956.7, z: 31.2 },
  weaponShop: { x: 22.0, y: -1105.0, z: 29.8 },
  clothesShop: { x: 72.0, y: -1399.0, z: 29.4 },
  airport: { x: -1538.0, y: -2954.0, z: 13.9 },
  hospitals: [
    { x: 298.0, y: -584.0, z: 43.3 },
    { x: -449.0, y: -340.0, z: 34.5 },
  ]
};

const WEAPONS = [
  { name: "Pistol", hash: 0x1B06D571, price: 500 },
  { name: "Combat Pistol", hash: 0x5EF9FEC4, price: 800 },
  { name: "SMG", hash: 0x2BE6766B, price: 2500 },
  { name: "Assault Rifle", hash: 0xBFEFFF6D, price: 5000 },
  { name: "Carbine Rifle", hash: 0x83BF0278, price: 6000 },
  { name: "Pump Shotgun", hash: 0x1D073A89, price: 3500 },
  { name: "Sniper Rifle", hash: 0x05FC3C11, price: 8000 },
  { name: "Micro SMG", hash: 0x13532244, price: 1800 },
  { name: "Knife", hash: 0x99B507EA, price: 100 },
  { name: "Body Armor", hash: 0, price: 1500, isArmor: true },
];

const CLOTHES = [
  { name: "White T-Shirt", component: 11, drawable: 0, texture: 0, price: 50 },
  { name: "Black T-Shirt", component: 11, drawable: 0, texture: 1, price: 50 },
  { name: "Blue Hoodie", component: 11, drawable: 55, texture: 0, price: 150 },
  { name: "Leather Jacket", component: 11, drawable: 14, texture: 0, price: 500 },
  { name: "Business Suit", component: 11, drawable: 4, texture: 0, price: 1000 },
  { name: "Jeans", component: 4, drawable: 0, texture: 0, price: 100 },
  { name: "Cargo Pants", component: 4, drawable: 5, texture: 0, price: 150 },
  { name: "Shorts", component: 4, drawable: 15, texture: 0, price: 80 },
  { name: "Sneakers", component: 6, drawable: 1, texture: 0, price: 100 },
  { name: "Boots", component: 6, drawable: 5, texture: 0, price: 200 },
];

const PHONE_SERVICES = [
  { name: "Mechanic - Free Car", action: "mechanic", price: 0 },
  { name: "Taxi Service", action: "taxi", price: 100 },
  { name: "Lester - Clear Wanted", action: "lester", price: 5000 },
  { name: "Mors Mutual - Restore Weapons", action: "mors", price: 1000 },
];

function createBlips() {
  if (blipsCreated) return;
  
  createBlip(LOCS.hotel, 40, 2, "Hotel (Spawn)");
  createBlip(LOCS.weaponShop, 110, 0, "Ammu-Nation");
  createBlip(LOCS.clothesShop, 73, 4, "Clothing Store");
  createBlip(LOCS.airport, 90, 3, "Airport");
  LOCS.hospitals.forEach(h => createBlip(h, 61, 1, "Hospital"));
  
  properties.forEach(p => {
    const owned = ownedProperties.includes(p.id);
    createBlip(p, owned ? 40 : 374, owned ? 2 : 69, p.name + (owned ? " (Owned)" : " - $" + p.price.toLocaleString()));
  });
  
  blipsCreated = true;
}

function createBlip(pos, sprite, color, name) {
  const blip = native.addBlipForCoord(pos.x, pos.y, pos.z);
  native.setBlipSprite(blip, sprite);
  native.setBlipColour(blip, color);
  native.setBlipScale(blip, 0.9);
  native.setBlipAsShortRange(blip, false);
  native.beginTextCommandSetBlipName("STRING");
  native.addTextComponentSubstringPlayerName(name);
  native.endTextCommandSetBlipName(blip);
}

// Server events
alt.onServer("example:init", (m, props, owned) => {
  money = m;
  properties = props;
  ownedProperties = owned || [];
  createBlips();
});

alt.onServer("example:money", (m) => { money = m; });
alt.onServer("example:wanted", (w) => { wanted = w; });
alt.onServer("example:death", () => { isDead = true; activeMenu = null; insideProperty = null; });
alt.onServer("example:respawn", () => { isDead = false; });
alt.onServer("example:bought", (type) => { notify("~g~" + type + " purchased!"); });
alt.onServer("example:noMoney", () => { notify("~r~Not enough money!"); });
alt.onServer("example:alreadyOwned", () => { notify("~y~You already own this!"); });

alt.onServer("example:propertyBought", (id, name) => {
  ownedProperties.push(id);
  notify("~g~Purchased: " + name);
  activeMenu = null;
});

alt.onServer("example:enteredProperty", (name) => {
  const prop = properties.find(p => p.name === name);
  if (prop) insideProperty = prop;
  notify("~b~Entered: " + name);
});

alt.onServer("example:exitedProperty", () => {
  insideProperty = null;
});

alt.onServer("phone:taxiLocations", (locs) => {
  taxiLocations = locs;
  activeMenu = "taxi";
  selectedIndex = 0;
});

alt.onServer("phone:serviceComplete", (msg) => {
  notify("~g~" + msg);
  activeMenu = null;
});

alt.on("syncedMetaChange", (entity, key, value) => {
  if (entity !== alt.Player.local) return;
  if (key === "money") money = value;
  if (key === "wanted") wanted = value;
});

function notify(text) {
  native.beginTextCommandThefeedPost("STRING");
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandThefeedPostTicker(false, true);
}

function dist(a, b) {
  return native.getDistanceBetweenCoords(a.x, a.y, a.z, b.x, b.y, b.z, true);
}

function getNearbyInteraction() {
  const pos = alt.Player.local.pos;
  if (dist(pos, LOCS.weaponShop) < 5) return { type: "weapon" };
  if (dist(pos, LOCS.clothesShop) < 5) return { type: "clothes" };
  
  for (const p of properties) {
    if (dist(pos, p) < 5) {
      return { type: "property", property: p };
    }
  }
  return null;
}

// Crime detection
let lastShot = 0;
alt.everyTick(() => {
  if (native.isPedShooting(alt.Player.local.scriptID)) {
    if (Date.now() - lastShot > 5000) {
      lastShot = Date.now();
      alt.emitServer("example:addWanted", 1);
    }
  }
});

// Key handling
alt.on("keyup", (key) => {
  if (isDead) return;
  
  // P - Phone
  if (key === 80 && !activeMenu) {
    activeMenu = "phone";
    selectedIndex = 0;
    return;
  }
  
  // E - Interact
  if (key === 69 && !activeMenu) {
    // If inside property, exit
    if (insideProperty) {
      alt.emitServer("example:exitProperty", insideProperty.id);
      return;
    }
    
    const interaction = getNearbyInteraction();
    if (interaction) {
      if (interaction.type === "property") {
        const prop = interaction.property;
        if (ownedProperties.includes(prop.id)) {
          // Enter owned property
          alt.emitServer("example:enterProperty", prop.id);
        } else {
          // Open buy menu
          activeMenu = "property";
          selectedIndex = properties.findIndex(p => p.id === prop.id);
        }
      } else {
        activeMenu = interaction.type;
        selectedIndex = 0;
      }
    }
    return;
  }
  
  // Menu navigation
  if (activeMenu) {
    let items = getMenuItems();
    
    if (key === 38) selectedIndex = Math.max(0, selectedIndex - 1);
    if (key === 40) selectedIndex = Math.min(items.length - 1, selectedIndex + 1);
    
    if (key === 13) handleMenuSelect();
    if (key === 27 || key === 8) activeMenu = null;
  }
});

function getMenuItems() {
  if (activeMenu === "weapon") return WEAPONS;
  if (activeMenu === "clothes") return CLOTHES;
  if (activeMenu === "property") return properties;
  if (activeMenu === "phone") return PHONE_SERVICES;
  if (activeMenu === "taxi") return taxiLocations;
  return [];
}

function handleMenuSelect() {
  if (activeMenu === "weapon") {
    const w = WEAPONS[selectedIndex];
    if (w.isArmor) native.setPedArmour(alt.Player.local.scriptID, 100);
    alt.emitServer("example:buyWeapon", w.hash, w.price);
  } 
  else if (activeMenu === "clothes") {
    const c = CLOTHES[selectedIndex];
    alt.emitServer("example:buyClothes", c.component, c.drawable, c.texture, c.price);
  }
  else if (activeMenu === "property") {
    const p = properties[selectedIndex];
    if (ownedProperties.includes(p.id)) {
      alt.emitServer("example:enterProperty", p.id);
      activeMenu = null;
    } else {
      alt.emitServer("example:buyProperty", p.id);
    }
  }
  else if (activeMenu === "phone") {
    const service = PHONE_SERVICES[selectedIndex];
    alt.emitServer("phone:" + service.action);
    if (service.action !== "taxi") activeMenu = null;
  }
  else if (activeMenu === "taxi") {
    const loc = taxiLocations[selectedIndex];
    alt.emitServer("phone:taxiGo", loc.x, loc.y, loc.z);
    activeMenu = null;
  }
}

// Drawing helpers
function drawText(text, x, y, scale, r, g, b, center) {
  native.setTextFont(4);
  native.setTextScale(scale, scale);
  native.setTextColour(r, g, b, 255);
  native.setTextOutline();
  if (center) native.setTextCentre(true);
  else { native.setTextRightJustify(true); native.setTextWrap(0, x); }
  native.beginTextCommandDisplayText("STRING");
  native.addTextComponentSubstringPlayerName(text);
  native.endTextCommandDisplayText(x, y, 0);
}

function drawRect(x, y, w, h, r, g, b, a) {
  native.drawRect(x, y, w, h, r, g, b, a, false);
}

function drawMenuItem(name, price, y, selected, canAfford, isOwned) {
  if (selected) drawRect(0.5, y + 0.012, 0.33, 0.035, 255, 200, 50, 120);
  
  const col = canAfford || isOwned ? [255, 255, 255] : [120, 120, 120];
  native.setTextFont(4);
  native.setTextScale(0.3, 0.3);
  native.setTextColour(col[0], col[1], col[2], 255);
  native.setTextOutline();
  native.beginTextCommandDisplayText("STRING");
  native.addTextComponentSubstringPlayerName(name);
  native.endTextCommandDisplayText(0.35, y, 0);
  
  const priceText = isOwned ? "OWNED - ENTER" : (price === 0 ? "FREE" : "$" + price.toLocaleString());
  const priceCol = isOwned ? [100, 200, 100] : (canAfford ? [114, 204, 114] : [200, 80, 80]);
  native.setTextFont(4);
  native.setTextScale(0.3, 0.3);
  native.setTextColour(priceCol[0], priceCol[1], priceCol[2], 255);
  native.setTextRightJustify(true);
  native.setTextWrap(0, 0.65);
  native.setTextOutline();
  native.beginTextCommandDisplayText("STRING");
  native.addTextComponentSubstringPlayerName(priceText);
  native.endTextCommandDisplayText(0.65, y, 0);
}

// Main render
alt.everyTick(() => {
  if (!money) {
    const m = alt.Player.local.getSyncedMeta("money");
    if (m) money = m;
  }
  
  // Money HUD
  drawText("$" + (money || 0).toLocaleString(), 0.98, 0.02, 0.5, 114, 204, 114, false);
  
  // Wanted stars
  const w = alt.Player.local.getSyncedMeta("wanted") || 0;
  if (w > 0) {
    let stars = "";
    for (let i = 0; i < 5; i++) stars += i < w ? "★" : "☆";
    drawText(stars, 0.98, 0.06, 0.5, 255, 100, 100, false);
  }
  
  // Inside property indicator
  if (insideProperty) {
    drawText("Inside: " + insideProperty.name, 0.5, 0.02, 0.4, 100, 200, 255, true);
    drawText("Press E to Exit", 0.5, 0.06, 0.3, 200, 200, 200, true);
  }
  
  // Phone hint
  if (!activeMenu && !isDead && !insideProperty) {
    drawText("P - Phone", 0.98, 0.94, 0.3, 200, 200, 200, false);
  }
  
  // Death screen
  if (isDead) {
    drawRect(0.5, 0.5, 1, 1, 0, 0, 0, 180);
    drawText("WASTED", 0.5, 0.4, 2.5, 180, 25, 25, true);
    drawText("Respawning...", 0.5, 0.55, 0.45, 255, 255, 255, true);
    return;
  }
  
  // Interaction prompts
  if (!activeMenu && !insideProperty) {
    const interaction = getNearbyInteraction();
    if (interaction) {
      let label = "";
      if (interaction.type === "weapon") label = "Ammu-Nation";
      else if (interaction.type === "clothes") label = "Clothing Store";
      else if (interaction.type === "property") {
        const owned = ownedProperties.includes(interaction.property.id);
        label = owned ? "Enter " + interaction.property.name : "Buy " + interaction.property.name;
      }
      drawText("Press E - " + label, 0.5, 0.85, 0.4, 255, 255, 255, true);
    }
  }
  
  // Menu UI
  if (activeMenu) {
    const items = getMenuItems();
    let title = "";
    let hint = "ENTER: Select | ESC: Close";
    
    if (activeMenu === "weapon") title = "AMMU-NATION";
    else if (activeMenu === "clothes") title = "CLOTHING STORE";
    else if (activeMenu === "property") { title = "PROPERTIES"; hint = "ENTER: Buy/Enter | ESC: Close"; }
    else if (activeMenu === "phone") { title = "PHONE"; hint = "ENTER: Call | ESC: Close"; }
    else if (activeMenu === "taxi") { title = "TAXI - SELECT DESTINATION"; hint = "ENTER: Go | ESC: Cancel"; }
    
    const menuHeight = Math.min(items.length, 10) * 0.04 + 0.2;
    drawRect(0.5, 0.5, 0.35, menuHeight + 0.1, 0, 0, 0, 220);
    drawRect(0.5, 0.5 - menuHeight / 2 - 0.02, 0.35, 0.06, 40, 40, 40, 255);
    
    drawText(title, 0.5, 0.5 - menuHeight / 2 - 0.04, 0.55, 255, 200, 50, true);
    drawText("Cash: $" + (money || 0).toLocaleString(), 0.5, 0.5 - menuHeight / 2 + 0.02, 0.35, 114, 204, 114, true);
    
    const startY = 0.5 - menuHeight / 2 + 0.08;
    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      const y = startY + i * 0.04;
      const selected = i === selectedIndex;
      
      let name, price, isOwned = false;
      if (activeMenu === "property") {
        name = item.name;
        price = item.price;
        isOwned = ownedProperties.includes(item.id);
      } else if (activeMenu === "taxi") {
        name = item.name;
        price = 0;
      } else {
        name = item.name;
        price = item.price;
      }
      
      drawMenuItem(name, price, y, selected, money >= price, isOwned);
    }
    
    drawRect(0.5, 0.5 + menuHeight / 2 + 0.01, 0.35, 0.04, 40, 40, 40, 255);
    drawText(hint, 0.5, 0.5 + menuHeight / 2 - 0.005, 0.25, 180, 180, 180, true);
  }
  
  // 3D markers
  if (!activeMenu && !insideProperty) {
    const pos = alt.Player.local.pos;
    
    if (dist(pos, LOCS.weaponShop) < 30) {
      native.drawMarker(1, LOCS.weaponShop.x, LOCS.weaponShop.y, LOCS.weaponShop.z - 1, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1, 255, 200, 50, 120, false, false, 2, false, null, null, false);
    }
    if (dist(pos, LOCS.clothesShop) < 30) {
      native.drawMarker(1, LOCS.clothesShop.x, LOCS.clothesShop.y, LOCS.clothesShop.z - 1, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1, 100, 150, 255, 120, false, false, 2, false, null, null, false);
    }
    
    properties.forEach(p => {
      if (dist(pos, p) < 50) {
        const owned = ownedProperties.includes(p.id);
        const col = owned ? [100, 255, 100] : [255, 100, 100];
        native.drawMarker(1, p.x, p.y, p.z - 1, 0, 0, 0, 0, 0, 0, 2, 2, 1.5, col[0], col[1], col[2], 150, false, false, 2, false, null, null, false);
      }
    });
  }
});
