// Server - spawn, money, weapons, clothes, properties, wanted - all persisted
import * as alt from "alt-server";

const DEFAULT_SPAWN = { x: -269.0, y: -956.7, z: 31.2 };
const HOSPITALS = [
  { x: 298.0, y: -584.0, z: 43.3 },
  { x: -449.0, y: -340.0, z: 34.5 },
];
const DEFAULT_MONEY = 5000;
const RESPAWN_TIME = 5000;

// Properties for sale - exterior and interior positions
const PROPERTIES = [
  { id: 1, name: "Cheap Apartment", x: -35.0, y: -580.0, z: 38.0, ix: -32.0, iy: -576.0, iz: 80.0, price: 25000 },
  { id: 2, name: "Del Perro Apartment", x: -1447.0, y: -538.0, z: 34.7, ix: -1452.0, iy: -540.0, iz: 74.0, price: 80000 },
  { id: 3, name: "Vinewood House", x: -174.0, y: 502.0, z: 137.4, ix: -174.0, iy: 497.0, iz: 137.4, price: 150000 },
  { id: 4, name: "Beach House", x: -1905.0, y: -570.0, z: 11.8, ix: -1905.0, iy: -573.0, iz: 11.8, price: 300000 },
];

let pool = null;
const playerData = new Map();

async function getPool() {
  if (pool) return pool;
  const mysql = (await import("mysql2/promise")).default;
  pool = mysql.createPool(`mysql://${process.env.MYSQL_USER || "altv"}:${process.env.MYSQL_PASSWORD || "altv"}@${process.env.MYSQL_HOST || "mysql"}:${process.env.MYSQL_PORT || "3306"}/${process.env.MYSQL_DATABASE || "altv"}`);
  
  // Create tables
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS player_properties (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_name VARCHAR(255),
      property_id INT,
      UNIQUE KEY unique_prop (player_name, property_id)
    )
  `);
  
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS player_weapons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_name VARCHAR(255),
      weapon_hash BIGINT,
      ammo INT DEFAULT 100,
      UNIQUE KEY unique_weapon (player_name, weapon_hash)
    )
  `);
  
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS player_clothes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_name VARCHAR(255) UNIQUE,
      clothes_data TEXT
    )
  `);
  
  alt.log("[example] Database tables ready");
  return pool;
}

// Database functions
async function getPlayerMoney(name) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT money FROM players WHERE name = ?", [name]);
    return rows?.[0]?.money ?? DEFAULT_MONEY;
  } catch { return DEFAULT_MONEY; }
}

async function savePlayerMoney(name, money) {
  try {
    const p = await getPool();
    await p.execute("INSERT INTO players (name, money) VALUES (?, ?) ON DUPLICATE KEY UPDATE money = ?", [name, money, money]);
  } catch (e) { alt.logError("[example] Save money error: " + e.message); }
}

async function getPlayerProperties(name) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT property_id FROM player_properties WHERE player_name = ?", [name]);
    return rows.map(r => r.property_id);
  } catch { return []; }
}

async function savePlayerProperty(name, propId) {
  try {
    const p = await getPool();
    await p.execute("INSERT IGNORE INTO player_properties (player_name, property_id) VALUES (?, ?)", [name, propId]);
  } catch (e) { alt.logError("[example] Save property error: " + e.message); }
}

async function getPlayerWeapons(name) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT weapon_hash, ammo FROM player_weapons WHERE player_name = ?", [name]);
    return rows.map(r => ({ hash: Number(r.weapon_hash), ammo: r.ammo }));
  } catch { return []; }
}

async function savePlayerWeapon(name, hash, ammo) {
  try {
    const p = await getPool();
    await p.execute("INSERT INTO player_weapons (player_name, weapon_hash, ammo) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE ammo = ?", [name, hash, ammo, ammo]);
  } catch (e) { alt.logError("[example] Save weapon error: " + e.message); }
}

async function getPlayerClothes(name) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT clothes_data FROM player_clothes WHERE player_name = ?", [name]);
    return rows?.[0]?.clothes_data ? JSON.parse(rows[0].clothes_data) : null;
  } catch { return null; }
}

async function savePlayerClothes(name, clothesData) {
  try {
    const p = await getPool();
    await p.execute("INSERT INTO player_clothes (player_name, clothes_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE clothes_data = ?", 
      [name, JSON.stringify(clothesData), JSON.stringify(clothesData)]);
  } catch (e) { alt.logError("[example] Save clothes error: " + e.message); }
}

function spawnPlayer(player, pos) {
  player.model = "mp_m_freemode_01";
  player.spawn(pos.x, pos.y, pos.z, 0);
  player.health = 200;
  player.armour = 0;
}

// Player connect
alt.on("playerConnect", async (player) => {
  alt.log(`[example] ${player.name} connected`);
  
  spawnPlayer(player, DEFAULT_SPAWN);
  
  // Initialize player data
  playerData.set(player.id, { wanted: 0, clothes: {} });
  
  alt.setTimeout(async () => {
    if (!player?.valid) return;
    
    // Load all player data from DB
    const money = await getPlayerMoney(player.name);
    const props = await getPlayerProperties(player.name);
    const weapons = await getPlayerWeapons(player.name);
    const clothes = await getPlayerClothes(player.name);
    
    player.setSyncedMeta("money", money);
    player.setSyncedMeta("wanted", 0);
    
    // Give saved weapons
    for (const w of weapons) {
      player.giveWeapon(w.hash, w.ammo, false);
    }
    
    // Apply saved clothes
    if (clothes) {
      for (const [comp, data] of Object.entries(clothes)) {
        player.setClothes(Number(comp), data.drawable, data.texture, 0);
      }
      playerData.get(player.id).clothes = clothes;
    }
    
    alt.log(`[example] ${player.name}: $${money}, ${props.length} properties, ${weapons.length} weapons`);
    
    // Send init data to client
    alt.emitClient(player, "example:init", money, PROPERTIES, props);
  }, 800);
});

// Player death
alt.on("playerDeath", (player) => {
  alt.log(`[example] ${player.name} died`);
  
  const data = playerData.get(player.id);
  if (data) data.wanted = 0;
  player.setSyncedMeta("wanted", 0);
  
  alt.emitClient(player, "example:death");
  
  alt.setTimeout(async () => {
    if (!player?.valid) return;
    
    const props = await getPlayerProperties(player.name);
    let spawnPos;
    let fee = 500;
    
    if (props.length > 0) {
      const prop = PROPERTIES.find(p => p.id === props[0]);
      if (prop) {
        spawnPos = prop;
        fee = 0;
      }
    }
    
    if (!spawnPos) {
      spawnPos = HOSPITALS[Math.floor(Math.random() * HOSPITALS.length)];
    }
    
    spawnPlayer(player, spawnPos);
    
    // Restore weapons
    const weapons = await getPlayerWeapons(player.name);
    for (const w of weapons) {
      player.giveWeapon(w.hash, w.ammo, false);
    }
    
    // Restore clothes
    const data = playerData.get(player.id);
    if (data?.clothes) {
      for (const [comp, d] of Object.entries(data.clothes)) {
        player.setClothes(Number(comp), d.drawable, d.texture, 0);
      }
    }
    
    const money = player.getSyncedMeta("money") || DEFAULT_MONEY;
    const newMoney = Math.max(0, money - fee);
    player.setSyncedMeta("money", newMoney);
    
    alt.emitClient(player, "example:money", newMoney);
    alt.emitClient(player, "example:respawn", fee);
    
    await savePlayerMoney(player.name, newMoney);
  }, RESPAWN_TIME);
});

// Buy weapon
alt.onClient("example:buyWeapon", async (player, hash, price) => {
  const money = player.getSyncedMeta("money") || 0;
  
  if (money >= price) {
    const newMoney = money - price;
    player.setSyncedMeta("money", newMoney);
    
    if (hash !== 0) {
      player.giveWeapon(hash, 250, true);
      await savePlayerWeapon(player.name, hash, 250);
    }
    
    alt.emitClient(player, "example:money", newMoney);
    alt.emitClient(player, "example:bought", "weapon");
    await savePlayerMoney(player.name, newMoney);
    alt.log(`[example] ${player.name} bought weapon ${hash}`);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

// Buy clothes
alt.onClient("example:buyClothes", async (player, component, drawable, texture, price) => {
  const money = player.getSyncedMeta("money") || 0;
  
  if (money >= price) {
    const newMoney = money - price;
    player.setSyncedMeta("money", newMoney);
    player.setClothes(component, drawable, texture, 0);
    
    // Save clothes
    const data = playerData.get(player.id);
    if (data) {
      data.clothes[component] = { drawable, texture };
      await savePlayerClothes(player.name, data.clothes);
    }
    
    alt.emitClient(player, "example:money", newMoney);
    alt.emitClient(player, "example:bought", "clothes");
    await savePlayerMoney(player.name, newMoney);
    alt.log(`[example] ${player.name} bought clothes`);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

// Buy property
alt.onClient("example:buyProperty", async (player, propertyId) => {
  alt.log(`[example] ${player.name} trying to buy property ${propertyId}`);
  
  const prop = PROPERTIES.find(p => p.id === propertyId);
  if (!prop) {
    alt.log(`[example] Property ${propertyId} not found`);
    return;
  }
  
  const owned = await getPlayerProperties(player.name);
  if (owned.includes(propertyId)) {
    alt.emitClient(player, "example:alreadyOwned");
    return;
  }
  
  const money = player.getSyncedMeta("money") || 0;
  alt.log(`[example] ${player.name} has $${money}, property costs $${prop.price}`);
  
  if (money >= prop.price) {
    const newMoney = money - prop.price;
    player.setSyncedMeta("money", newMoney);
    
    await savePlayerProperty(player.name, propertyId);
    await savePlayerMoney(player.name, newMoney);
    
    alt.emitClient(player, "example:money", newMoney);
    alt.emitClient(player, "example:propertyBought", propertyId, prop.name);
    
    alt.log(`[example] ${player.name} bought ${prop.name} for $${prop.price}`);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

// Enter property (teleport inside)
alt.onClient("example:enterProperty", async (player, propertyId) => {
  const owned = await getPlayerProperties(player.name);
  if (!owned.includes(propertyId)) return;
  
  const prop = PROPERTIES.find(p => p.id === propertyId);
  if (prop) {
    // Teleport to interior position
    player.pos = new alt.Vector3(prop.ix, prop.iy, prop.iz);
    alt.emitClient(player, "example:enteredProperty", prop.name);
    alt.log(`[example] ${player.name} entered ${prop.name}`);
  }
});

// Exit property (teleport outside)
alt.onClient("example:exitProperty", async (player, propertyId) => {
  const prop = PROPERTIES.find(p => p.id === propertyId);
  if (prop) {
    player.pos = new alt.Vector3(prop.x, prop.y, prop.z);
    alt.emitClient(player, "example:exitedProperty");
    alt.log(`[example] ${player.name} exited ${prop.name}`);
  }
});

// Teleport to property from phone
alt.onClient("example:goToProperty", async (player, propertyId) => {
  const owned = await getPlayerProperties(player.name);
  if (!owned.includes(propertyId)) return;
  
  const prop = PROPERTIES.find(p => p.id === propertyId);
  if (prop) {
    player.pos = new alt.Vector3(prop.x, prop.y, prop.z);
    alt.log(`[example] ${player.name} teleported to ${prop.name}`);
  }
});

// Wanted level
alt.onClient("example:addWanted", (player, stars) => {
  const data = playerData.get(player.id);
  if (!data) return;
  
  data.wanted = Math.min(5, data.wanted + stars);
  player.setSyncedMeta("wanted", data.wanted);
  alt.emitClient(player, "example:wanted", data.wanted);
});

alt.onClient("example:clearWanted", (player) => {
  const data = playerData.get(player.id);
  if (data) data.wanted = 0;
  player.setSyncedMeta("wanted", 0);
  alt.emitClient(player, "example:wanted", 0);
});

// Phone services
alt.onClient("phone:mechanic", (player) => {
  // Spawn a vehicle near player
  const pos = player.pos;
  const vehicle = new alt.Vehicle("sultan", new alt.Vector3(pos.x + 3, pos.y + 3, pos.z), new alt.Vector3(0, 0, 0));
  alt.emitClient(player, "phone:serviceComplete", "Mechanic delivered a car!");
  alt.log(`[example] Mechanic service for ${player.name}`);
});

alt.onClient("phone:taxi", (player) => {
  // Teleport to a random location
  const locations = [
    { x: -269.0, y: -956.7, z: 31.2, name: "Hotel" },
    { x: -1538.0, y: -2954.0, z: 13.9, name: "Airport" },
    { x: 22.0, y: -1105.0, z: 29.8, name: "Ammu-Nation" },
    { x: -1447.0, y: -538.0, z: 34.7, name: "Del Perro" },
  ];
  const fee = 100;
  const money = player.getSyncedMeta("money") || 0;
  
  if (money >= fee) {
    player.setSyncedMeta("money", money - fee);
    alt.emitClient(player, "example:money", money - fee);
    alt.emitClient(player, "phone:taxiLocations", locations);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

alt.onClient("phone:taxiGo", (player, x, y, z) => {
  player.pos = new alt.Vector3(x, y, z);
  alt.emitClient(player, "phone:serviceComplete", "Taxi arrived!");
});

alt.onClient("phone:lester", (player) => {
  const fee = 5000;
  const money = player.getSyncedMeta("money") || 0;
  
  if (money >= fee) {
    const data = playerData.get(player.id);
    if (data) data.wanted = 0;
    player.setSyncedMeta("wanted", 0);
    player.setSyncedMeta("money", money - fee);
    alt.emitClient(player, "example:money", money - fee);
    alt.emitClient(player, "example:wanted", 0);
    alt.emitClient(player, "phone:serviceComplete", "Lester cleared your wanted level!");
    savePlayerMoney(player.name, money - fee);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

alt.onClient("phone:mors", async (player) => {
  const fee = 1000;
  const money = player.getSyncedMeta("money") || 0;
  
  if (money >= fee) {
    player.setSyncedMeta("money", money - fee);
    alt.emitClient(player, "example:money", money - fee);
    
    // Give back all weapons
    const weapons = await getPlayerWeapons(player.name);
    for (const w of weapons) {
      player.giveWeapon(w.hash, w.ammo, false);
    }
    
    alt.emitClient(player, "phone:serviceComplete", "Mors Mutual restored your weapons!");
    await savePlayerMoney(player.name, money - fee);
  } else {
    alt.emitClient(player, "example:noMoney");
  }
});

// Disconnect - save everything
alt.on("playerDisconnect", async (player) => {
  const money = player.getSyncedMeta("money");
  if (money !== undefined) {
    await savePlayerMoney(player.name, money);
  }
  
  // Save current weapon ammo
  const weapons = player.weapons;
  for (const hash of Object.keys(weapons)) {
    await savePlayerWeapon(player.name, Number(hash), weapons[hash]);
  }
  
  playerData.delete(player.id);
  alt.log(`[example] ${player.name} disconnected, data saved`);
});

alt.log("[example] Server loaded with persistence.");
