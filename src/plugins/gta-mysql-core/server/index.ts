import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import mysql from 'mysql2/promise';
import type { Appearance } from '@Shared/types/appearance.js';
import { runMigrations } from './database/migrations.js';
import {
    PlayerWeaponService,
    PropertyService,
    WeaponShopService,
    ClothingShopService,
    PhoneService,
    CasinoService,
    VehicleService,
    AuthService,
    AppearanceService,
    sendTestEmail,
    WEAPON_CATALOG,
    WEAPON_SHOP_LOCATIONS,
    CLOTHING_CATALOG,
    CLOTHING_SHOP_LOCATIONS,
    CASINO_LOCATIONS,
    VEHICLE_CATALOG,
    VEHICLE_DEALERSHIPS,
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

interface PlayerSession {
    oderId: number;
    email: string;
    money: number;
    bank: number;
}

const playerSessions = new Map<number, PlayerSession>();

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
// PLAYER CONNECT/DISCONNECT
// ============================================================================

alt.on('playerConnect', async (player) => {
    alt.log(`[gta-mysql-core] Player connected: ${player.id}`);
    spawnPlayerSafe(player);
    notifyPlayer(player, 'Welcome! Press T to open Login / Register. Press P for phone when logged in.');

    // Send shop locations to client
    alt.emitClient(player, 'gta:locations:update', {
        weaponShops: WEAPON_SHOP_LOCATIONS,
        clothingShops: CLOTHING_SHOP_LOCATIONS,
        casinos: CASINO_LOCATIONS,
    });

    // Send property locations to client for map blips
    try {
        const allProperties = await propertyService.getAllProperties();
        alt.emitClient(player, 'property:list', allProperties);
    } catch (err) {
        alt.logWarning(`[gta-mysql-core] Failed to load properties for blips: ${(err as Error).message}`);
    }
});

alt.on('playerDisconnect', async (player) => {
    const session = playerSessions.get(player.id);
    if (session) {
        await savePlayerMoney(session.email, session.money, session.bank);
        // Only save weapons if player object is still valid
        if (player.valid) {
            try {
                await weaponService.savePlayerWeapons(player, session.oderId);
            } catch (err) {
                alt.logWarning(`[gta-mysql-core] Could not save weapons: ${(err as Error).message}`);
            }
        }
        alt.log(`[gta-mysql-core] Saved data for ${session.email}`);
    }
    playerSessions.delete(player.id);
    playersInProperty.delete(player.id);
});

// ============================================================================
// PLAYER DEATH & RESPAWN
// ============================================================================

/** Street-level spawn points in front of each hospital (not on roof or inside building). */
interface HospitalSpawn {
    x: number;
    y: number;
    z: number;
    heading: number;
    name: string;
}

const HOSPITAL_SPAWNS: HospitalSpawn[] = [
    { x: 307.32, y: -595.38, z: 43.29, heading: 70, name: 'Pillbox Hill Medical Center' },
    { x: -449.67, y: -340.55, z: 34.51, heading: 0, name: 'Mount Zonah Medical Center' },
    { x: 1839.44, y: 3672.71, z: 34.28, heading: 0, name: 'Sandy Shores Medical Center' },
    { x: -247.46, y: 6331.23, z: 32.43, heading: 0, name: 'Paleto Bay Medical Center' },
];

/** Fallback if chosen hospital position is invalid (e.g. geometry). */
const FALLBACK_HOSPITAL = HOSPITAL_SPAWNS[0];

const HOSPITAL_FEE = 500;

function getNearestHospital(x: number, y: number, z: number): HospitalSpawn {
    let nearest = HOSPITAL_SPAWNS[0];
    let minDist = Infinity;

    for (const hospital of HOSPITAL_SPAWNS) {
        const dist = Math.sqrt(
            Math.pow(hospital.x - x, 2) + Math.pow(hospital.y - y, 2) + Math.pow(hospital.z - z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = hospital;
        }
    }

    return nearest;
}

alt.on('playerDeath', async (player, killer, weaponHash) => {
    const session = playerSessions.get(player.id);
    const deathPos = player.pos;

    alt.log(`[gta-mysql-core] Player ${player.id} died at ${deathPos.x}, ${deathPos.y}, ${deathPos.z}`);

    const hospital = getNearestHospital(deathPos.x, deathPos.y, deathPos.z);
    alt.log(
        `[gta-mysql-core] Respawn: player ${player.id} -> ${hospital.name} at ${hospital.x}, ${hospital.y}, ${hospital.z}`
    );

    alt.setTimeout(async () => {
        if (!player.valid) return;

        const spawnX = hospital.x;
        const spawnY = hospital.y;
        const spawnZ = hospital.z;
        const spawnHeading = hospital.heading;

        alt.log(
            `[gta-mysql-core] Respawn applying: spawn(${spawnX}, ${spawnY}, ${spawnZ}) heading=${spawnHeading}`
        );
        player.spawn(spawnX, spawnY, spawnZ, spawnHeading);
        player.health = 200;
        player.armour = 0;

        if (session) {
            if (session.money >= HOSPITAL_FEE) {
                session.money -= HOSPITAL_FEE;
                await savePlayerMoney(session.email, session.money, session.bank);
                syncMoneyToClient(player);
                notifyPlayer(player, `Respawned at ${hospital.name}. Hospital fee: $${HOSPITAL_FEE}`);
            } else {
                notifyPlayer(player, `Respawned at ${hospital.name}. (No fee - insufficient funds)`);
            }
            await applyCharacterLook(player, session.oderId);
            await weaponService.loadWeaponsToPlayer(player, session.oderId);
        } else {
            notifyPlayer(player, `Respawned at ${hospital.name}`);
        }

        playersInProperty.delete(player.id);

        // Respawn: do not send coords so client does not overwrite with ground probe (avoids clinic roof bug)
        alt.log(`[gta-mysql-core] Respawn done, emitting gta:spawn:safe (no coords)`);
        alt.emitClient(player, 'gta:spawn:safe');
    }, 5000);

    notifyPlayer(player, 'You died! Respawning in 5 seconds...');
});

// ============================================================================
// PROPERTY SYSTEM - Player inside property tracking
// ============================================================================

const playersInProperty = new Map<number, number>(); // playerId -> propertyId

// ============================================================================
// CLIENT EVENT HANDLERS
// ============================================================================

// ============================================================================
// AUTH EVENTS (UI-based login/register/forgot password/change password)
// ============================================================================

alt.onClient('auth:register', async (player, username: string, email: string, password: string, confirmPassword: string) => {
    await clearExistingSession(player);
    if (password !== confirmPassword) {
        alt.emitClient(player, 'auth:registerResult', { success: false, message: 'Password and confirmation do not match.' });
        return;
    }
    const pool = await getMySQLPool();
    const result = await authService.register({ username, email, password });
    if (!result.success) {
        alt.emitClient(player, 'auth:registerResult', { success: false, message: result.message });
        return;
    }
    const session: PlayerSession = {
        oderId: result.session!.playerId,
        email: result.session!.email,
        money: result.session!.money,
        bank: result.session!.bank,
    };
    await completeLogin(player, session);
    alt.emitClient(player, 'auth:registerResult', { success: true, message: result.message });
    notifyPlayer(player, `Registered! Cash: $${session.money}`);
});

alt.onClient('auth:login', async (player, loginIdentifier: string, password: string) => {
    await getMySQLPool();
    await clearExistingSession(player);
    const result = await authService.login(loginIdentifier, password);
    if (!result.success) {
        alt.emitClient(player, 'auth:loginResult', { success: false, message: result.message, passwordChangeRequired: false });
        return;
    }
    const session: PlayerSession = {
        oderId: result.session!.playerId,
        email: result.session!.email,
        money: result.session!.money,
        bank: result.session!.bank,
    };
    if (result.session!.passwordChangeRequired) {
        playerSessions.set(player.id, session);
        player.setMeta('playerId', session.oderId);
        alt.emitClient(player, 'auth:loginResult', { success: true, message: 'You must set a new password.', passwordChangeRequired: true });
        notifyPlayer(player, 'You must change your password to continue.');
        return;
    }
    await completeLogin(player, session);
    alt.emitClient(player, 'auth:loginResult', { success: true, message: result.message, passwordChangeRequired: false });
    notifyPlayer(player, `Welcome back! Cash: $${session.money}`);
});

alt.onClient('auth:forgotPassword', async (player, email: string) => {
    const result = await authService.requestPasswordReset(email);
    alt.emitClient(player, 'auth:forgotPasswordResult', { success: result.success, message: result.message });
    if (result.success) notifyPlayer(player, result.message);
});

alt.onClient('auth:changePassword', async (player, currentPassword: string, newPassword: string, confirmPassword: string) => {
    const session = playerSessions.get(player.id);
    if (!session) {
        alt.emitClient(player, 'auth:changePasswordResult', { success: false, message: 'You must be logged in to change password.' });
        return;
    }
    const result = await authService.changePassword(session.oderId, currentPassword, newPassword, confirmPassword);
    if (!result.success) {
        alt.emitClient(player, 'auth:changePasswordResult', { success: false, message: result.message });
        return;
    }
    alt.emitClient(player, 'auth:changePasswordResult', { success: true, message: result.message });
    await completeLogin(player, session);
    notifyPlayer(player, 'Password changed. Welcome!');
});

alt.onClient('auth:logout', async (player) => {
    const session = playerSessions.get(player.id);
    if (!session) {
        notifyPlayer(player, 'You are not logged in.');
        return;
    }
    await getMySQLPool();
    try {
        await weaponService.savePlayerWeapons(player, session.oderId);
        await vehicleService.despawnAllPlayerVehicles(session.oderId);
        playerSessions.delete(player.id);
        playersInProperty.delete(player.id);
        player.deleteMeta('playerId');
        alt.emitClient(player, 'gta:logout');
        player.removeAllWeapons();
        notifyPlayer(player, 'You have been logged out. Press T to login again.');
    } catch (err) {
        notifyPlayer(player, `Error: ${(err as Error).message}`);
    }
});

// Chat handler
alt.onClient('gta:chat:send', async (player, msg: string) => {
    if (!msg || msg.trim().length === 0) return;

    if (msg.startsWith('/')) {
        const args = msg.slice(1).split(' ');
        const command = args.shift()?.toLowerCase();
        await handleCommand(player, command || '', args);
        return;
    }

    const session = playerSessions.get(player.id);
    const name = session ? session.email.split('@')[0] : `Player${player.id}`;
    for (const p of alt.Player.all) {
        if (p.valid) notifyPlayer(p, `${name}: ${msg}`);
    }
});

// Phone events
alt.onClient('phone:getData', async (player) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const data = await phoneService.getPhoneData(session.oderId);
    alt.emitClient(player, 'phone:data', data);
});

alt.onClient('phone:addContact', async (player, name: string, number: string) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const result = await phoneService.addContact(session.oderId, name, number);
    notifyPlayer(player, result.message);
    if (result.success) {
        const data = await phoneService.getPhoneData(session.oderId);
        alt.emitClient(player, 'phone:data', data);
    }
});

alt.onClient('phone:deleteContact', async (player, contactId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const result = await phoneService.deleteContact(session.oderId, contactId);
    notifyPlayer(player, result.message);
});

alt.onClient('phone:sendMessage', async (player, receiverId: number, message: string) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const result = await phoneService.sendMessage(session.oderId, receiverId, message);
    notifyPlayer(player, result.message);
});

// Property events
alt.onClient('property:getList', async (player) => {
    const properties = await propertyService.getAllProperties();
    alt.emitClient(player, 'property:list', properties);
});

alt.onClient('property:requestList', async (player) => {
    const properties = await propertyService.getAllProperties();
    alt.emitClient(player, 'property:list', properties);
});

alt.onClient('property:buy', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        alt.emitClient(player, 'property:buyResult', { success: false, message: 'You must login first' });
        return; 
    }
    const result = await propertyService.buyProperty(session.oderId, propertyId, session.money);
    alt.emitClient(player, 'property:buyResult', result);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
        broadcastPropertyUpdate();
    }
});

alt.onClient('property:sell', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        alt.emitClient(player, 'property:sellResult', { success: false, message: 'You must login first' });
        return; 
    }
    const result = await propertyService.sellProperty(session.oderId, propertyId, session.money);
    alt.emitClient(player, 'property:sellResult', result);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
        broadcastPropertyUpdate();
    }
});

alt.onClient('property:enter', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        alt.emitClient(player, 'property:enterResult', { success: false, message: 'You must login first' });
        return; 
    }
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) { 
        alt.emitClient(player, 'property:enterResult', { success: false, message: 'Property not found' });
        return; 
    }
    if (property.owner_player_id !== session.oderId) { 
        alt.emitClient(player, 'property:enterResult', { success: false, message: 'You do not own this property' });
        return; 
    }

    const ix = property.interior_x;
    const iy = property.interior_y;
    const iz = property.interior_z;
    const hasValidInterior =
        typeof ix === 'number' &&
        typeof iy === 'number' &&
        typeof iz === 'number' &&
        !(ix === 0 && iy === 0 && iz === 0);
    if (!hasValidInterior) {
        alt.logWarning(
            `[gta-mysql-core] property:enter propertyId=${propertyId} has invalid interior coords (${ix}, ${iy}, ${iz}) - fix in DB`
        );
        alt.emitClient(player, 'property:enterResult', {
            success: false,
            message: 'Property interior is not configured. Contact an administrator.',
        });
        return;
    }

    alt.log(
        `[gta-mysql-core] property:enter player=${player.id} propertyId=${propertyId} name=${property.name} interior=${ix}, ${iy}, ${iz}`
    );
    player.pos = new alt.Vector3(ix, iy, iz);
    playersInProperty.set(player.id, propertyId);
    alt.emitClient(player, 'property:enterResult', { 
        success: true, 
        message: `Entered ${property.name}`,
        interior: {
            x: property.interior_x,
            y: property.interior_y,
            z: property.interior_z,
            heading: property.interior_heading || 0,
            ipl: property.ipl || undefined
        }
    });
});

alt.onClient('property:exit', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    const currentPropertyId = playersInProperty.get(player.id);
    
    if (!currentPropertyId) { 
        alt.emitClient(player, 'property:exitResult', { success: false, message: 'You are not inside a property' });
        return; 
    }
    
    const property = await propertyService.getPropertyById(currentPropertyId);
    if (!property) {
        alt.emitClient(player, 'property:exitResult', { success: false, message: 'Property not found' });
        return;
    }
    
    playersInProperty.delete(player.id);
    player.pos = new alt.Vector3(property.pos_x, property.pos_y, property.pos_z + 1.0);
    alt.emitClient(player, 'property:exitResult', { 
        success: true, 
        message: `Exited ${property.name}`,
        exterior: {
            x: property.pos_x,
            y: property.pos_y,
            z: property.pos_z
        }
    });
});

// Weapon shop events
alt.onClient('weaponshop:getCatalog', (player) => {
    alt.emitClient(player, 'weaponshop:catalog', WEAPON_CATALOG);
});

alt.onClient('weaponshop:buy', async (player, weaponHash: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { notifyPlayer(player, 'You must login first'); return; }
    const result = await weaponShopService.buyWeapon(player, session.oderId, weaponHash, session.money);
    notifyPlayer(player, result.message);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
    }
});

alt.onClient('weaponshop:buyAmmo', async (player, weaponHash: number, amount: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { notifyPlayer(player, 'You must login first'); return; }
    const result = await weaponShopService.buyAmmo(player, session.oderId, weaponHash, amount, session.money);
    notifyPlayer(player, result.message);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
    }
});

// Clothing shop events
alt.onClient('clothingshop:getCatalog', (player) => {
    alt.emitClient(player, 'clothingshop:catalog', CLOTHING_CATALOG);
});

alt.onClient('clothingshop:preview', (player, component: number, drawable: number, texture: number) => {
    clothingShopService.previewClothing(player, component, drawable, texture);
});

alt.onClient('clothingshop:buy', async (player, component: number, drawable: number, texture: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { notifyPlayer(player, 'You must login first'); return; }
    const result = await clothingShopService.buyClothing(player, session.oderId, component, drawable, texture, session.money);
    notifyPlayer(player, result.message);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
    }
});

// Casino events
alt.onClient('casino:playSlots', async (player, betAmount: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { notifyPlayer(player, 'You must login first'); return; }
    const result = await casinoService.playSlots(session.oderId, betAmount, session.money);
    notifyPlayer(player, result.message);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
        alt.emitClient(player, 'casino:slotsResult', result.result);
    }
});

alt.onClient('casino:playRoulette', async (player, betAmount: number, betType: string, betValue: number | string) => {
    const session = playerSessions.get(player.id);
    if (!session) { notifyPlayer(player, 'You must login first'); return; }
    const result = await casinoService.playRoulette(session.oderId, betAmount, betType as any, betValue, session.money);
    notifyPlayer(player, result.message);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
        alt.emitClient(player, 'casino:rouletteResult', result.result);
    }
});

alt.onClient('casino:getHistory', async (player) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const history = await casinoService.getPlayerHistory(session.oderId);
    alt.emitClient(player, 'casino:history', history);
});

// ============================================================================
// VEHICLE EVENTS
// ============================================================================

alt.onClient('vehicle:getCatalog', (player) => {
    alt.emitClient(player, 'vehicle:catalog', VEHICLE_CATALOG);
});

alt.onClient('vehicle:getMyVehicles', async (player) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const vehicles = await vehicleService.getPlayerVehicles(session.oderId);
    alt.emitClient(player, 'vehicle:myVehicles', vehicles);
});

alt.onClient('vehicle:buy', async (player, model: string, modelHash: number, price: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        alt.emitClient(player, 'vehicle:buyResult', { success: false, message: 'You must login first' });
        return; 
    }
    const result = await vehicleService.buyVehicle(session.oderId, model, modelHash, price, session.money);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
        
        // Auto-spawn the purchased vehicle near the player
        if (result.vehicleId) {
            const pos = player.pos;
            const rot = player.rot;
            // Spawn vehicle 3 meters in front of player
            const spawnX = pos.x + Math.sin(-rot.z) * 3;
            const spawnY = pos.y + Math.cos(-rot.z) * 3;
            const spawnZ = pos.z;
            await vehicleService.spawnVehicle(result.vehicleId, spawnX, spawnY, spawnZ, rot.z);
            alt.log(`[gta-mysql-core] Auto-spawned vehicle ${result.vehicleId} for player ${session.oderId}`);
        }
    }
    alt.emitClient(player, 'vehicle:buyResult', result);
});

alt.onClient('vehicle:sell', async (player, vehicleId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        alt.emitClient(player, 'vehicle:sellResult', { success: false, message: 'You must login first' });
        return; 
    }
    const result = await vehicleService.sellVehicle(session.oderId, vehicleId, session.money);
    if (result.success && result.newBalance !== undefined) {
        session.money = result.newBalance;
        syncMoneyToClient(player);
    }
    alt.emitClient(player, 'vehicle:sellResult', result);
});

alt.onClient('vehicle:spawn', async (player, vehicleId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        notifyPlayer(player, 'You must login first');
        return; 
    }
    const pos = player.pos;
    const heading = player.rot.z * (180 / Math.PI);
    const result = await vehicleService.spawnVehicle(player, vehicleId, pos.x + 3, pos.y, pos.z, heading);
    notifyPlayer(player, result.message);
});

alt.onClient('vehicle:store', async (player, vehicleId: number, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        notifyPlayer(player, 'You must login first');
        return; 
    }
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
        notifyPlayer(player, 'Property not found');
        return;
    }
    if (property.owner_player_id !== session.oderId) {
        notifyPlayer(player, 'You don\'t own this property');
        return;
    }
    const garageSlots = (property as any).garage_slots || 2;
    const result = await vehicleService.storeVehicle(session.oderId, vehicleId, propertyId, garageSlots);
    notifyPlayer(player, result.message);
    if (result.success) {
        const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
        alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
    }
});

alt.onClient('vehicle:storeNearby', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        notifyPlayer(player, 'You must login first');
        return; 
    }
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
        notifyPlayer(player, 'Property not found');
        return;
    }
    if (property.owner_player_id !== session.oderId) {
        notifyPlayer(player, 'You don\'t own this property');
        return;
    }
    const garageSlots = (property as any).garage_slots || 2;
    const result = await vehicleService.storeNearbyVehicle(player, session.oderId, propertyId, garageSlots);
    notifyPlayer(player, result.message);
    if (result.success) {
        const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
        alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
    }
});

alt.onClient('vehicle:getGarageVehicles', async (player, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) return;
    const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
    alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
});

alt.onClient('vehicle:spawnFromGarage', async (player, vehicleId: number, propertyId: number) => {
    const session = playerSessions.get(player.id);
    if (!session) { 
        notifyPlayer(player, 'You must login first');
        return; 
    }
    const property = await propertyService.getPropertyById(propertyId);
    if (!property) {
        notifyPlayer(player, 'Property not found');
        return;
    }
    const garageX = (property as any).garage_x || property.pos_x;
    const garageY = (property as any).garage_y || property.pos_y;
    const garageZ = (property as any).garage_z || property.pos_z;
    const garageHeading = (property as any).garage_heading || 0;
    
    const result = await vehicleService.spawnVehicle(player, vehicleId, garageX, garageY, garageZ, garageHeading);
    notifyPlayer(player, result.message);
    if (result.success) {
        const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
        alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
    }
});

// ============================================================================
// COMMAND HANDLER
// ============================================================================

async function handleCommand(player: alt.Player, command: string, args: string[]): Promise<void> {
    const session = playerSessions.get(player.id);

    switch (command) {
        case 'register':
        case 'login': {
            notifyPlayer(player, 'Use the Auth menu (press T) to login or register.');
            break;
        }
        case 'logout': {
            if (!session) { notifyPlayer(player, 'You are not logged in'); return; }
            try {
                // Save weapons before logout
                await weaponService.savePlayerWeapons(player, session.oderId);
                // Despawn player vehicles
                await vehicleService.despawnAllPlayerVehicles(session.oderId);
                // Clear session
                playerSessions.delete(player.id);
                player.deleteMeta('playerId');
                // Reset client state
                alt.emitClient(player, 'gta:logout');
                // Remove weapons from player
                player.removeAllWeapons();
                notifyPlayer(player, 'You have been logged out. Press T to open the Auth menu to login again.');
            } catch (err) { notifyPlayer(player, `Error: ${(err as Error).message}`); }
            break;
        }
        case 'money': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            notifyPlayer(player, `Cash: $${session.money} | Bank: $${session.bank}`);
            break;
        }
        case 'givemoney': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const amount = parseInt(args[0]) || 1000;
            session.money += amount;
            await savePlayerMoney(session.email, session.money, session.bank);
            syncMoneyToClient(player);
            notifyPlayer(player, `Added $${amount}. Total: $${session.money}`);
            break;
        }
        case 'car': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const model = args[0] || 'sultan';
            try {
                new alt.Vehicle(model, new alt.Vector3(player.pos.x + 2, player.pos.y + 2, player.pos.z), player.rot);
                notifyPlayer(player, `Spawned: ${model}`);
            } catch { notifyPlayer(player, `Invalid model: ${model}`); }
            break;
        }
        case 'weapons': {
            notifyPlayer(player, 'Weapons: /buyweapon <name>, /ammo <amount>');
            WEAPON_CATALOG.slice(0, 5).forEach(w => notifyPlayer(player, `${w.name}: $${w.price}`));
            break;
        }
        case 'buyweapon': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const weaponName = args.join(' ').toLowerCase();
            const weapon = WEAPON_CATALOG.find(w => w.name.toLowerCase() === weaponName);
            if (!weapon) { notifyPlayer(player, 'Weapon not found. Use /weapons to see list'); return; }
            const result = await weaponShopService.buyWeapon(player, session.oderId, weapon.hash, session.money);
            notifyPlayer(player, result.message);
            if (result.success && result.newBalance !== undefined) {
                session.money = result.newBalance;
                syncMoneyToClient(player);
            }
            break;
        }
        case 'properties': {
            const props = await propertyService.getAvailableProperties();
            notifyPlayer(player, `Available properties (${props.length}):`);
            props.forEach(p => notifyPlayer(player, `#${p.id} ${p.name}: $${p.price}`));
            break;
        }
        case 'myproperties': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const props = await propertyService.getPlayerProperties(session.oderId);
            if (props.length === 0) { notifyPlayer(player, 'You own no properties'); return; }
            notifyPlayer(player, `Your properties (${props.length}):`);
            props.forEach(p => notifyPlayer(player, `#${p.id} ${p.name}`));
            break;
        }
        case 'faceinfo': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const appearance = await appearanceService.loadOrCreateDefaultAppearance(session.oderId, 1);
            notifyPlayer(
                player,
                `Face: father=${appearance.faceFather ?? 0} mother=${appearance.faceMother ?? 0} skinFather=${appearance.skinFather ?? 0} skinMother=${appearance.skinMother ?? 0} faceMix=${appearance.faceMix ?? 0.5} skinMix=${appearance.skinMix ?? 0.5} sex=${appearance.sex ?? 1}`
            );
            notifyPlayer(player, 'Use /face <father> <mother> <skinFather> <skinMother> <faceMix 0-1> <skinMix 0-1>');
            notifyPlayer(player, 'Use /sex <male|female> if you need to switch the freemode base first.');
            break;
        }
        case 'face': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            if (args.length < 6) {
                notifyPlayer(player, 'Usage: /face <father> <mother> <skinFather> <skinMother> <faceMix 0-1> <skinMix 0-1>');
                return;
            }

            const faceFather = Number(args[0]);
            const faceMother = Number(args[1]);
            const skinFather = Number(args[2]);
            const skinMother = Number(args[3]);
            const faceMix = Number(args[4]);
            const skinMix = Number(args[5]);

            if ([faceFather, faceMother, skinFather, skinMother, faceMix, skinMix].some((value) => Number.isNaN(value))) {
                notifyPlayer(player, 'Invalid face values. /face expects 4 integers and 2 mix values.');
                return;
            }

            const saved = await saveAndApplyAppearance(player, session.oderId, {
                faceFather: clamp(Math.round(faceFather), 0, 45),
                faceMother: clamp(Math.round(faceMother), 0, 45),
                skinFather: clamp(Math.round(skinFather), 0, 45),
                skinMother: clamp(Math.round(skinMother), 0, 45),
                faceMix: clamp(faceMix, 0, 1),
                skinMix: clamp(skinMix, 0, 1),
            });

            notifyPlayer(
                player,
                `Face updated. father=${saved.faceFather} mother=${saved.faceMother} skinFather=${saved.skinFather} skinMother=${saved.skinMother} faceMix=${saved.faceMix} skinMix=${saved.skinMix}`
            );
            break;
        }
        case 'sex': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const value = (args[0] || '').toLowerCase();
            if (value !== 'male' && value !== 'female') {
                notifyPlayer(player, 'Usage: /sex <male|female>');
                return;
            }

            const sex = value === 'female' ? 0 : 1;
            await saveAndApplyAppearance(player, session.oderId, { sex });
            await clothingShopService.loadPlayerClothing(player, session.oderId);
            notifyPlayer(player, `Base model updated to ${value}. Use /faceinfo to see current face settings.`);
            break;
        }
        case 'buyproperty': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const propId = parseInt(args[0]);
            if (!propId) { notifyPlayer(player, 'Usage: /buyproperty <id>'); return; }
            const result = await propertyService.buyProperty(session.oderId, propId, session.money);
            notifyPlayer(player, result.message);
            if (result.success && result.newBalance !== undefined) {
                session.money = result.newBalance;
                syncMoneyToClient(player);
                broadcastPropertyUpdate();
            }
            break;
        }
        case 'sellproperty': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const propId = parseInt(args[0]);
            if (!propId) { notifyPlayer(player, 'Usage: /sellproperty <id>'); return; }
            const result = await propertyService.sellProperty(session.oderId, propId, session.money);
            notifyPlayer(player, result.message);
            if (result.success && result.newBalance !== undefined) {
                session.money = result.newBalance;
                syncMoneyToClient(player);
                broadcastPropertyUpdate();
            }
            break;
        }
        case 'enter': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const nearbyProp = await propertyService.getPropertyAtPosition(player.pos.x, player.pos.y, player.pos.z, 10);
            if (!nearbyProp) { notifyPlayer(player, 'No property nearby'); return; }
            if (nearbyProp.owner_player_id !== session.oderId) { notifyPlayer(player, 'You do not own this property'); return; }
            playersInProperty.set(player.id, nearbyProp.id);
            player.pos = new alt.Vector3(nearbyProp.interior_x, nearbyProp.interior_y, nearbyProp.interior_z);
            alt.emitClient(player, 'property:enterResult', {
                success: true,
                message: `Entered ${nearbyProp.name}`,
                interior: {
                    x: nearbyProp.interior_x,
                    y: nearbyProp.interior_y,
                    z: nearbyProp.interior_z,
                    heading: nearbyProp.interior_heading || 0,
                    ipl: nearbyProp.ipl || undefined,
                },
            });
            break;
        }
        case 'exit': {
            const propId = playersInProperty.get(player.id);
            if (!propId) { notifyPlayer(player, 'You are not inside a property'); return; }
            const prop = await propertyService.getPropertyById(propId);
            if (prop) {
                player.pos = new alt.Vector3(prop.pos_x, prop.pos_y, prop.pos_z + 1.0);
                alt.emitClient(player, 'property:exitResult', {
                    success: true,
                    message: `Exited ${prop.name}`,
                    exterior: {
                        x: prop.pos_x,
                        y: prop.pos_y,
                        z: prop.pos_z,
                    },
                });
            }
            playersInProperty.delete(player.id);
            break;
        }
        case 'slots': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const bet = parseInt(args[0]) || 100;
            const result = await casinoService.playSlots(session.oderId, bet, session.money);
            notifyPlayer(player, result.message);
            if (result.result) notifyPlayer(player, `[ ${result.result.symbols.join(' | ')} ]`);
            if (result.success && result.newBalance !== undefined) {
                session.money = result.newBalance;
                syncMoneyToClient(player);
            }
            break;
        }
        case 'roulette': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const bet = parseInt(args[0]) || 100;
            const betType = args[1] || 'color';
            const betValue = args[2] || 'red';
            const result = await casinoService.playRoulette(session.oderId, bet, betType as any, betValue, session.money);
            notifyPlayer(player, result.message);
            if (result.success && result.newBalance !== undefined) {
                session.money = result.newBalance;
                syncMoneyToClient(player);
            }
            break;
        }
        case 'contact': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const [name, number] = args;
            if (!name || !number) { notifyPlayer(player, 'Usage: /contact <name> <number>'); return; }
            const result = await phoneService.addContact(session.oderId, name, number);
            notifyPlayer(player, result.message);
            break;
        }
        case 'contacts': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const contacts = await phoneService.getContacts(session.oderId);
            if (contacts.length === 0) { notifyPlayer(player, 'No contacts'); return; }
            notifyPlayer(player, `Contacts (${contacts.length}):`);
            contacts.forEach(c => notifyPlayer(player, `${c.contact_name}: ${c.contact_number}`));
            break;
        }
        case 'sms': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const receiverId = parseInt(args[0]);
            const message = args.slice(1).join(' ');
            if (!receiverId || !message) { notifyPlayer(player, 'Usage: /sms <playerId> <message>'); return; }
            const result = await phoneService.sendMessage(session.oderId, receiverId, message);
            notifyPlayer(player, result.message);
            break;
        }
        case 'tp': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const x = parseFloat(args[0]);
            const y = parseFloat(args[1]);
            const z = parseFloat(args[2]);
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                notifyPlayer(player, 'Usage: /tp <x> <y> <z>');
                return;
            }
            player.pos = new alt.Vector3(x, y, z);
            notifyPlayer(player, `Teleported to ${x}, ${y}, ${z}`);
            break;
        }
        case 'casino': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            player.pos = new alt.Vector3(924.0, 46.0, 81.1);
            notifyPlayer(player, 'Teleported to Diamond Casino');
            break;
        }
        case 'myvehicles': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const vehicles = await vehicleService.getPlayerVehicles(session.oderId);
            if (vehicles.length === 0) { 
                notifyPlayer(player, 'You don\'t own any vehicles. Visit a dealership!'); 
                return; 
            }
            notifyPlayer(player, `Your vehicles (${vehicles.length}):`);
            vehicles.forEach(v => {
                const status = v.is_spawned ? 'Spawned' : v.garage_property_id ? 'In Garage' : 'Stored';
                notifyPlayer(player, `[${v.id}] ${v.model} - ${status}`);
            });
            break;
        }
        case 'spawnvehicle': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const vehicleId = parseInt(args[0]);
            if (!vehicleId) { notifyPlayer(player, 'Usage: /spawnvehicle <vehicleId>'); return; }
            const pos = player.pos;
            const heading = player.rot.z * (180 / Math.PI);
            const result = await vehicleService.spawnVehicle(player, vehicleId, pos.x + 3, pos.y, pos.z, heading);
            notifyPlayer(player, result.message);
            break;
        }
        case 'dealership': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            player.pos = new alt.Vector3(-56.49, -1097.25, 26.42);
            notifyPlayer(player, 'Teleported to Premium Deluxe Motorsport');
            break;
        }
        case 'testmail': {
            const toEmail = args[0]?.trim() || (session?.email ?? '');
            if (!toEmail) {
                notifyPlayer(player, 'Usage: /testmail <email> (or login and use /testmail to send to your account email)');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(toEmail)) {
                notifyPlayer(player, 'Please enter a valid email address.');
                return;
            }
            notifyPlayer(player, `Sending test email to ${toEmail}...`);
            const result = await sendTestEmail(toEmail);
            if (result.success) {
                notifyPlayer(player, 'Test email sent. Check the inbox (and spam folder) for that address.');
            } else {
                notifyPlayer(player, result.error === 'Mail not configured' ? 'Mail not configured. Set MAIL_* in .env.' : `Failed: ${result.error}`);
            }
            break;
        }
        case 'help': {
            notifyPlayer(player, '=== Commands ===');
            notifyPlayer(player, '/register, /login, /logout, /money');
            notifyPlayer(player, '/weapons, /buyweapon <name>');
            notifyPlayer(player, '/properties, /myproperties');
            notifyPlayer(player, '/myvehicles, /spawnvehicle <id>, /dealership');
            notifyPlayer(player, '/slots <bet>, /roulette <bet> <type> <value>');
            notifyPlayer(player, '/contact, /contacts, /sms');
            notifyPlayer(player, '/tp <x> <y> <z>, /casino');
            notifyPlayer(player, '/testmail <email> – send test email (checks mail config)');
            notifyPlayer(player, 'Press E near shops/properties to interact');
            notifyPlayer(player, 'Press M for phone menu');
            break;
        }
        default:
            notifyPlayer(player, `Unknown command: /${command}. Use /help`);
    }
}

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
