/**
 * Database resource: MySQL for alt:V (GTA V).
 * Config: set MYSQL_CONNECTION_STRING or (in Docker) MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.
 */
import * as alt from "alt-server";

const MYSQL_CONNECTION_STRING = process.env.MYSQL_CONNECTION_STRING;
const MYSQL_HOST = process.env.MYSQL_HOST || "mysql";
const MYSQL_PORT = parseInt(process.env.MYSQL_PORT || "3306", 10);
const MYSQL_USER = process.env.MYSQL_USER || "altv";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || "altv";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || "altv";

function buildConnectionString() {
  if (MYSQL_CONNECTION_STRING) return MYSQL_CONNECTION_STRING;
  const enc = encodeURIComponent;
  return `mysql://${enc(MYSQL_USER)}:${enc(MYSQL_PASSWORD)}@${MYSQL_HOST}:${MYSQL_PORT}/${enc(MYSQL_DATABASE)}?charset=utf8mb4`;
}

let pool = null;
let _ready = false;

async function getPool() {
  if (pool) return pool;
  const mysql = (await import("mysql2/promise")).default;
  pool = mysql.createPool(buildConnectionString());
  return pool;
}

export function isReady() { return _ready; }

// Generic query helper for other resources
export async function query(sql, params) {
  const p = await getPool();
  const [rows] = await p.execute(sql, params ?? []);
  return rows;
}

async function ensureTables(p) {
  await p.execute(`
    CREATE TABLE IF NOT EXISTS players (
      name VARCHAR(255) PRIMARY KEY,
      money BIGINT NOT NULL DEFAULT 0,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    )
  `);
  await p.execute(`
    CREATE TABLE IF NOT EXISTS config (
      \`key\` VARCHAR(255) PRIMARY KEY,
      value TEXT,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    )
  `);
  await p.execute(`
    CREATE TABLE IF NOT EXISTS characters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account VARCHAR(255) NOT NULL,
      slot TINYINT NOT NULL DEFAULT 0,
      name VARCHAR(100) NOT NULL,
      sex TINYINT NOT NULL DEFAULT 0,
      health FLOAT NOT NULL DEFAULT 200,
      armour FLOAT NOT NULL DEFAULT 0,
      cash BIGINT NOT NULL DEFAULT 5000,
      bank BIGINT NOT NULL DEFAULT 0,
      x FLOAT NOT NULL DEFAULT -269.0,
      y FLOAT NOT NULL DEFAULT -956.7,
      z FLOAT NOT NULL DEFAULT 31.2,
      heading FLOAT NOT NULL DEFAULT 0,
      appearance JSON,
      created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY account_slot (account, slot)
    )
  `);
  await p.execute(`
    CREATE TABLE IF NOT EXISTS character_appearance (
      name VARCHAR(255) PRIMARY KEY,
      appearance JSON NOT NULL,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    )
  `);
  await p.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      label         VARCHAR(100) NOT NULL,
      type          ENUM('house','apartment','garage') NOT NULL DEFAULT 'house',
      price         BIGINT NOT NULL DEFAULT 50000,
      enter_x       FLOAT NOT NULL,
      enter_y       FLOAT NOT NULL,
      enter_z       FLOAT NOT NULL,
      enter_heading FLOAT NOT NULL DEFAULT 0,
      exit_x        FLOAT NOT NULL,
      exit_y        FLOAT NOT NULL,
      exit_z        FLOAT NOT NULL,
      exit_heading  FLOAT NOT NULL DEFAULT 0,
      ipl           VARCHAR(100) DEFAULT NULL,
      owner_char_id INT DEFAULT NULL,
      locked        TINYINT NOT NULL DEFAULT 1,
      cashbox       BIGINT  NOT NULL DEFAULT 0
    )
  `);
  await p.execute(`
    CREATE TABLE IF NOT EXISTS owned_vehicles (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      character_id   INT NOT NULL,
      model          VARCHAR(64)  NOT NULL,
      plate          VARCHAR(8)   NOT NULL,
      color1         TINYINT      NOT NULL DEFAULT 0,
      color2         TINYINT      NOT NULL DEFAULT 0,
      fuel           FLOAT        NOT NULL DEFAULT 100.0,
      mileage        FLOAT        NOT NULL DEFAULT 0.0,
      body_health    FLOAT        NOT NULL DEFAULT 1000.0,
      engine_health  FLOAT        NOT NULL DEFAULT 1000.0,
      stored_x       FLOAT        NOT NULL DEFAULT -44.0,
      stored_y       FLOAT        NOT NULL DEFAULT -1096.0,
      stored_z       FLOAT        NOT NULL DEFAULT 26.5,
      stored_heading FLOAT        NOT NULL DEFAULT 0.0,
      created_at     DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3),
      updated_at     DATETIME(3)  DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY plate_uk (plate)
    )
  `);
}

async function initAndEmitReady() {
  if (_ready) return;
  try {
    const p = await getPool();
    await p.execute("SELECT 1");
    await ensureTables(p);
    _ready = true;
    alt.emit("database:Ready");
    alt.log("[database] MySQL connected, tables ready.");
  } catch (e) {
    alt.logWarning("[database] MySQL init failed:", e.message);
  }
}

// --- Money (uses players table, keyed by player.name) ---
const DEFAULT_MONEY = 5000;

export async function getMoney(player) {
  if (!player || !player.valid) return 0;
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT money FROM players WHERE name = ?", [player.name]);
    const money = (rows && rows.length > 0) ? Number(rows[0].money) : DEFAULT_MONEY;
    // Store in meta for quick access and sync to client
    player.setMeta("money", money);
    player.setSyncedMeta("money", money);
    alt.log(`[database] getMoney for ${player.name}: ${money}`);
    return money;
  } catch (e) {
    alt.logError("[database] getMoney failed:", e);
    player.setMeta("money", DEFAULT_MONEY);
    player.setSyncedMeta("money", DEFAULT_MONEY);
    return DEFAULT_MONEY;
  }
}

export async function setMoney(player, amount) {
  if (!player || !player.valid) return;
  const value = Math.max(0, Math.floor(Number(amount)));
  player.setMeta("money", value);
  player.setSyncedMeta("money", value);
  try {
    const p = await getPool();
    await p.execute(
      "INSERT INTO players (name, money) VALUES (?, ?) ON DUPLICATE KEY UPDATE money = VALUES(money)",
      [player.name, value]
    );
    alt.log(`[database] setMoney for ${player.name}: ${value}`);
  } catch (e) {
    alt.logError("[database] setMoney failed:", e);
  }
}

export function getMoneySync(player) {
  const v = player.getMeta("money");
  return typeof v === "number" ? v : 0;
}

export function setMoneySync(player, amount) {
  const value = Math.max(0, Math.floor(Number(amount)));
  player.setMeta("money", value);
  player.setSyncedMeta("money", value);
  setMoney(player, value).catch(() => {});
}

// --- Config (key-value store) ---
export async function getConfig(key) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT value FROM config WHERE `key` = ?", [String(key)]);
    if (!rows.length) return null;
    const v = rows[0].value;
    try { return JSON.parse(v); } catch { return v; }
  } catch (e) { return null; }
}

export async function setConfig(key, value) {
  try {
    const p = await getPool();
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await p.execute(
      "INSERT INTO config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [String(key), serialized]
    );
  } catch (e) {
    alt.logError("[database] setConfig failed:", e);
  }
}

// --- Appearance ---
export const DEFAULT_APPEARANCE = {
  sex: 0,
  father: 0, mother: 0, shapeMix: 0.5, skinMix: 0.5,
  hair: 0, hairColor: 0, hairHighlight: 0,
  eyeColor: 0,
  faceFeatures: Array(20).fill(0),
  overlays: Array(13).fill(null).map(() => ({ style: 0, opacity: 0.0, color: 0, secondColor: 0 })),
};

export async function getAppearance(playerName) {
  try {
    const p = await getPool();
    const [rows] = await p.execute("SELECT appearance FROM character_appearance WHERE name = ?", [playerName]);
    if (!rows.length) return structuredClone(DEFAULT_APPEARANCE);
    const data = rows[0].appearance;
    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (e) {
    return structuredClone(DEFAULT_APPEARANCE);
  }
}

export async function setAppearance(playerName, appearance) {
  try {
    const p = await getPool();
    await p.execute(
      "INSERT INTO character_appearance (name, appearance) VALUES (?, ?) ON DUPLICATE KEY UPDATE appearance = VALUES(appearance)",
      [playerName, JSON.stringify(appearance)]
    );
  } catch (e) {
    alt.logError("[database] setAppearance failed:", e);
  }
}

export function applyAppearance(player, appearance) {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  player.model = a.sex === 1 ? "mp_f_freemode_01" : "mp_m_freemode_01";
  player.setHeadBlendData(
    a.father, a.mother, 0,
    a.father, a.mother, 0,
    a.shapeMix, a.skinMix, 0,
    false
  );
  const features = a.faceFeatures ?? Array(20).fill(0);
  for (let i = 0; i < 20; i++) player.setFaceFeature(i, features[i] ?? 0);
  player.setClothes(2, a.hair ?? 0, 0, 0);
  player.setHairColor(a.hairColor ?? 0, a.hairHighlight ?? 0);
  player.setEyeColor(a.eyeColor ?? 0);
  const overlays = a.overlays ?? DEFAULT_APPEARANCE.overlays;
  for (let i = 0; i < 13; i++) {
    const o = overlays[i] ?? { style: 0, opacity: 0, color: 0, secondColor: 0 };
    player.setHeadOverlay(i, o.style, o.opacity);
    player.setHeadOverlayColor(i, 1, o.color, o.secondColor);
  }
}

// --- Lifecycle ---
alt.on("playerConnect", async (player) => {
  if (!_ready) await initAndEmitReady();
});

// Eagerly init on resource start (MySQL is healthy via depends_on)
initAndEmitReady().catch(e => alt.logError("[database] Eager init failed:", e));

alt.log("[database] Resource loaded.");
