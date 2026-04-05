import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import mysql from 'mysql2/promise';
import type { Appearance } from '@Shared/types/appearance.js';
import { runMigrations } from './database/migrations.js';
import { handleChatCommand, type ChatCommandDeps } from './commands/handleChatCommand.js';
import { registerAuthClientEvents } from './events/registerAuthClientEvents.js';
import { registerCasinoClientEvents } from './events/registerCasinoClientEvents.js';
import { registerChatClientEvents } from './events/registerChatClientEvents.js';
import { registerClothingShopClientEvents } from './events/registerClothingShopClientEvents.js';
import { registerPhoneClientEvents } from './events/registerPhoneClientEvents.js';
import { registerPlayerLifecycleEvents } from './events/registerPlayerLifecycleEvents.js';
import { registerPropertyClientEvents } from './events/registerPropertyClientEvents.js';
import { registerVehicleClientEvents } from './events/registerVehicleClientEvents.js';
import { registerWeaponShopClientEvents } from './events/registerWeaponShopClientEvents.js';
import type { PlayerSession } from './types/playerSession.js';
import {
    PlayerWeaponService,
    PropertyService,
    buildPropertyInteriorEnterPayload,
    WeaponShopService,
    ClothingShopService,
    PhoneService,
    CasinoService,
    VehicleService,
    AuthService,
    AppearanceService,
    sendTestEmail,
} from './services/index.js';

const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const messenger = Rebar.messenger.useMessenger();

// ============================================================================
// MySQL CONNECTION & SERVICES
// ============================================================================

let mysqlPool: mysql.Pool | null = null;
let weaponService: PlayerWeaponService;
let propertyService: PropertyService;
let weaponShopService: WeaponShopService;
let clothingShopService: ClothingShopService;
let phoneService: PhoneService;
let casinoService: CasinoService;
let vehicleService: VehicleService;
let authService: AuthService;
let appearanceService: AppearanceService;

async function getMySQLPool(): Promise<mysql.Pool> {
    if (mysqlPool) return mysqlPool;

    mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'mysql',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'gta',
        password: process.env.DB_PASSWORD || 'gta_password',
        database: process.env.DB_NAME || 'gta_rebar',
        waitForConnections: true,
        connectionLimit: 10,
    });

    // Run all migrations
    await runMigrations(mysqlPool);

    // Initialize services
    weaponService = new PlayerWeaponService(mysqlPool);
    propertyService = new PropertyService(mysqlPool);
    weaponShopService = new WeaponShopService(mysqlPool, weaponService);
    clothingShopService = new ClothingShopService(mysqlPool);
    phoneService = new PhoneService(mysqlPool);
    casinoService = new CasinoService(mysqlPool);
    vehicleService = new VehicleService(mysqlPool);
    authService = new AuthService(mysqlPool);
    appearanceService = new AppearanceService(mysqlPool);

    alt.log('[gta-mysql-core] MySQL pool and services initialized');
    return mysqlPool;
}

// ============================================================================
// PLAYER SESSION
// ============================================================================

const playerSessions = new Map<number, PlayerSession>();
const playersInProperty = new Map<number, number>(); // playerId -> propertyId

/** Apply appearance from MySQL then clothing (single source of truth for login/respawn). */
async function applyCharacterLook(player: alt.Player, playerId: number): Promise<void> {
    const appearance = await appearanceService.loadOrCreateDefaultAppearance(playerId, 1);
    Rebar.player.usePlayerAppearance(player).apply(appearance);
    await clothingShopService.loadPlayerClothing(player, playerId);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

async function saveAndApplyAppearance(player: alt.Player, playerId: number, patch: Partial<Appearance>): Promise<Partial<Appearance>> {
    const current = await appearanceService.loadOrCreateDefaultAppearance(playerId, (patch.sex as 0 | 1 | undefined) ?? 1);
    const nextAppearance = { ...current, ...patch };
    await appearanceService.saveAppearance(playerId, nextAppearance);
    Rebar.player.usePlayerAppearance(player).apply(nextAppearance);
    return nextAppearance;
}

/** Completes login: bind session, character, spawn, apply appearance + clothing, sync money and notify client. */
async function completeLogin(player: alt.Player, session: PlayerSession): Promise<void> {
    playerSessions.set(player.id, session);
    player.setMeta('playerId', session.oderId);
    alt.emitClient(player, 'gta:playerId', session.oderId);
    await bindCharacterForPlayer(player, session.email);
    spawnPlayerSafe(player);
    await applyCharacterLook(player, session.oderId);
    await weaponService.loadWeaponsToPlayer(player, session.oderId);
    syncMoneyToClient(player);
}

async function savePlayerMoney(email: string, money: number, bank: number): Promise<void> {
    const pool = await getMySQLPool();
    await pool.execute('UPDATE players SET money = ?, bank = ? WHERE email = ?', [money, bank, email]);
}

/** Clears current session (save weapons, despawn vehicles). Does not emit gta:logout. Use when replacing with new login. */
async function clearExistingSession(player: alt.Player): Promise<void> {
    const session = playerSessions.get(player.id);
    if (!session) return;
    await getMySQLPool();
    try {
        await weaponService.savePlayerWeapons(player, session.oderId);
        await vehicleService.despawnAllPlayerVehicles(session.oderId);
    } catch (err) {
        alt.logWarning(`[gta-mysql-core] clearExistingSession: ${(err as Error).message}`);
    }
    playerSessions.delete(player.id);
    playersInProperty.delete(player.id);
    player.deleteMeta('playerId');
}

async function refreshPlayerMoney(player: alt.Player): Promise<void> {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const pool = await getMySQLPool();
    const [rows] = await pool.execute('SELECT money, bank FROM players WHERE id = ?', [session.oderId]);
    const data = (rows as any[])[0];
    if (data) {
        session.money = data.money;
        session.bank = data.bank;
        alt.emitClient(player, 'gta:money:update', session.money, session.bank);
    }
}

// ============================================================================
// STATIC PARKED VEHICLES - Realistic parking spots around the city
// ============================================================================

const PARKED_VEHICLE_SPAWNS: Array<{ x: number; y: number; z: number; heading: number; model: string }> = [
    // Downtown Los Santos - Legion Square area
    { x: 228.5, y: -789.5, z: 30.5, heading: 160, model: 'oracle' },
    { x: 232.1, y: -791.2, z: 30.5, heading: 160, model: 'tailgater' },
    { x: 235.7, y: -792.9, z: 30.5, heading: 160, model: 'schafter2' },
    { x: 215.3, y: -810.1, z: 30.5, heading: 250, model: 'felon' },
    { x: 211.8, y: -806.5, z: 30.5, heading: 250, model: 'buffalo' },
    
    // Pillbox Hill - Near hospital
    { x: 338.9, y: -584.2, z: 28.8, heading: 70, model: 'ambulance' },
    { x: 297.5, y: -590.3, z: 43.2, heading: 160, model: 'oracle' },
    { x: 301.2, y: -592.1, z: 43.2, heading: 160, model: 'premier' },
    { x: 304.9, y: -593.9, z: 43.2, heading: 160, model: 'stanier' },
    
    // Vinewood area
    { x: 284.5, y: 176.8, z: 104.5, heading: 70, model: 'comet2' },
    { x: 288.2, y: 178.5, z: 104.5, heading: 70, model: 'infernus' },
    { x: 291.9, y: 180.2, z: 104.5, heading: 70, model: 'zentorno' },
    { x: 295.6, y: 181.9, z: 104.5, heading: 70, model: 'adder' },
    
    // Del Perro - Beach parking
    { x: -1183.5, y: -1509.2, z: 4.4, heading: 305, model: 'bison' },
    { x: -1179.8, y: -1512.9, z: 4.4, heading: 305, model: 'sandking' },
    { x: -1176.1, y: -1516.6, z: 4.4, heading: 305, model: 'dubsta' },
    { x: -1172.4, y: -1520.3, z: 4.4, heading: 305, model: 'baller' },
    
    // Vespucci Beach
    { x: -1267.8, y: -1329.5, z: 4.0, heading: 215, model: 'surfer' },
    { x: -1271.5, y: -1326.8, z: 4.0, heading: 215, model: 'blazer' },
    { x: -1275.2, y: -1324.1, z: 4.0, heading: 215, model: 'bifta' },
    
    // Little Seoul
    { x: -662.5, y: -854.2, z: 24.5, heading: 0, model: 'sultan' },
    { x: -658.8, y: -854.2, z: 24.5, heading: 0, model: 'futo' },
    { x: -655.1, y: -854.2, z: 24.5, heading: 0, model: 'penumbra' },
    { x: -651.4, y: -854.2, z: 24.5, heading: 0, model: 'elegy2' },
    
    // Mirror Park
    { x: 1035.2, y: -763.5, z: 57.5, heading: 270, model: 'minivan' },
    { x: 1035.2, y: -767.2, z: 57.5, heading: 270, model: 'prairie' },
    { x: 1035.2, y: -770.9, z: 57.5, heading: 270, model: 'blista' },
    
    // Davis area
    { x: 112.5, y: -1961.8, z: 20.8, heading: 0, model: 'buccaneer' },
    { x: 116.2, y: -1961.8, z: 20.8, heading: 0, model: 'vigero' },
    { x: 119.9, y: -1961.8, z: 20.8, heading: 0, model: 'ruiner' },
    { x: 123.6, y: -1961.8, z: 20.8, heading: 0, model: 'sabregt' },
    
    // Airport parking
    { x: -1034.5, y: -2733.2, z: 20.2, heading: 150, model: 'stretch' },
    { x: -1030.8, y: -2736.9, z: 20.2, heading: 150, model: 'cognoscenti' },
    { x: -1027.1, y: -2740.6, z: 20.2, heading: 150, model: 'superd' },
    
    // Rockford Hills
    { x: -825.5, y: -186.2, z: 37.6, heading: 120, model: 'exemplar' },
    { x: -821.8, y: -189.9, z: 37.6, heading: 120, model: 'felon2' },
    { x: -818.1, y: -193.6, z: 37.6, heading: 120, model: 'jackal' },
    
    // Near spawn point
    { x: 430.5, y: -1018.2, z: 28.5, heading: 90, model: 'sultan' },
    { x: 430.5, y: -1014.5, z: 28.5, heading: 90, model: 'buffalo' },
    { x: 430.5, y: -1010.8, z: 28.5, heading: 90, model: 'oracle' },
    { x: 430.5, y: -1007.1, z: 28.5, heading: 90, model: 'tailgater' },
    
    // Casino parking
    { x: 879.5, y: 12.2, z: 78.8, heading: 240, model: 'adder' },
    { x: 883.2, y: 14.9, z: 78.8, heading: 240, model: 'zentorno' },
    { x: 886.9, y: 17.6, z: 78.8, heading: 240, model: 't20' },
    { x: 890.6, y: 20.3, z: 78.8, heading: 240, model: 'osiris' },
];

const spawnedParkedVehicles: alt.Vehicle[] = [];

function spawnStaticParkedVehicles(): void {
    // Clear any existing
    spawnedParkedVehicles.forEach(v => { if (v?.valid) v.destroy(); });
    spawnedParkedVehicles.length = 0;
    
    // Spawn all parked vehicles
    for (const spawn of PARKED_VEHICLE_SPAWNS) {
        try {
            const vehicle = new alt.Vehicle(
                spawn.model,
                new alt.Vector3(spawn.x, spawn.y, spawn.z),
                new alt.Vector3(0, 0, spawn.heading * (Math.PI / 180))
            );
            vehicle.engineOn = false;
            vehicle.lockState = 1; // Unlocked - players can enter
            spawnedParkedVehicles.push(vehicle);
        } catch (err) {
            alt.logWarning(`[gta-mysql-core] Failed to spawn ${spawn.model}: ${(err as Error).message}`);
        }
    }
    
    alt.log(`[gta-mysql-core] Spawned ${spawnedParkedVehicles.length} parked vehicles`);
}

// ============================================================================
// AUTHENTICATION & CHARACTER BINDING
// ============================================================================

const DEFAULT_SPAWN = { x: 425.1, y: -979.5, z: 30.7 };

async function bindCharacterForPlayer(player: alt.Player, email: string): Promise<void> {
    const characterBinder = Rebar.document.character.useCharacterBinder(player, false);
    const existingChar = await db.get({ email }, Rebar.database.CollectionNames.Characters);
    if (existingChar) {
        characterBinder.bind(existingChar as any);
        return;
    }
    const newChar = { email, account_id: email, name: email.split('@')[0], pos: DEFAULT_SPAWN, health: 200, armour: 0, cash: 5000, bank: 10000 };
    const insertedId = await db.create(newChar, Rebar.database.CollectionNames.Characters);
    if (insertedId) {
        const char = await db.get({ _id: insertedId }, Rebar.database.CollectionNames.Characters);
        if (char) characterBinder.bind(char as any);
    }
}

function spawnPlayerSafe(player: alt.Player): void {
    player.model = 'mp_m_freemode_01';
    player.spawn(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z, 0);
    player.health = 200;
    alt.emitClient(player, 'gta:spawn:safe', DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z);
}

function notifyPlayer(player: alt.Player, message: string): void {
    alt.emitClient(player, 'gta:notify', message);
}

function syncMoneyToClient(player: alt.Player): void {
    const session = playerSessions.get(player.id);
    if (session) alt.emitClient(player, 'gta:money:update', session.money, session.bank);
}

async function broadcastPropertyUpdate(): Promise<void> {
    try {
        const allProperties = await propertyService.getAllProperties();
        for (const p of alt.Player.all) {
            if (p.valid) alt.emitClient(p, 'property:list', allProperties);
        }
    } catch (err) {
        alt.logWarning(`[gta-mysql-core] Failed to broadcast property update: ${(err as Error).message}`);
    }
}

// ============================================================================
// EVENT REGISTRATION (lifecycle, client RPCs, chat commands)
// ============================================================================

registerPlayerLifecycleEvents({
    playerSessions,
    playersInProperty,
    propertyService,
    weaponService,
    spawnPlayerSafe,
    notifyPlayer,
    savePlayerMoney,
    syncMoneyToClient,
    applyCharacterLook,
});

registerAuthClientEvents({
    authService,
    playerSessions,
    playersInProperty,
    weaponService,
    vehicleService,
    notifyPlayer,
    getMySQLPool,
    completeLogin,
    clearExistingSession,
});

const chatCommandDeps: ChatCommandDeps = {
    notifyPlayer,
    getSession: (p) => playerSessions.get(p.id),
    playerSessions,
    playersInProperty,
    weaponService,
    vehicleService,
    propertyService,
    casinoService,
    phoneService,
    appearanceService,
    clothingShopService,
    weaponShopService,
    savePlayerMoney,
    syncMoneyToClient,
    broadcastPropertyUpdate,
    buildPropertyInteriorEnterPayload,
    sendTestEmail,
    clamp,
    saveAndApplyAppearance,
};

async function handleCommand(player: alt.Player, command: string, args: string[]): Promise<void> {
    await handleChatCommand(chatCommandDeps, player, command, args);
}

registerChatClientEvents({
    playerSessions,
    notifyPlayer,
    handleCommand,
});

registerPhoneClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    phoneService,
    notifyPlayer,
});

registerPropertyClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    propertyService,
    playersInProperty,
    syncMoneyToClient,
    broadcastPropertyUpdate,
});

registerWeaponShopClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    weaponShopService,
    syncMoneyToClient,
    notifyPlayer,
});

registerClothingShopClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    clothingShopService,
    syncMoneyToClient,
    notifyPlayer,
});

registerCasinoClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    casinoService,
    syncMoneyToClient,
    notifyPlayer,
});

registerVehicleClientEvents({
    getSession: (player) => playerSessions.get(player.id),
    vehicleService,
    propertyService,
    syncMoneyToClient,
    notifyPlayer,
});

// ============================================================================
// INITIALIZE
// ============================================================================

async function init() {
    try {
        await getMySQLPool();
        alt.log('[gta-mysql-core] All services initialized');
    } catch (err) {
        alt.logError(`[gta-mysql-core] Init failed: ${(err as Error).message}`);
    }
}

init();

// Spawn static parked vehicles on server start
spawnStaticParkedVehicles();

alt.log('[gta-mysql-core] Plugin loaded - Full gameplay systems');
