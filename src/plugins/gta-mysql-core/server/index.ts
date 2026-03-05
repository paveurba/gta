import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import mysql from 'mysql2/promise';
import { runMigrations } from './database/migrations.js';
import {
    PlayerWeaponService,
    PropertyService,
    WeaponShopService,
    ClothingShopService,
    PhoneService,
    CasinoService,
    WEAPON_CATALOG,
    WEAPON_SHOP_LOCATIONS,
    CLOTHING_CATALOG,
    CLOTHING_SHOP_LOCATIONS,
    CASINO_LOCATIONS,
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

async function registerPlayer(email: string, password: string): Promise<PlayerSession> {
    alt.log(`[gta-mysql-core] Registering: ${email}`);
    const pool = await getMySQLPool();

    const [existing] = await pool.execute('SELECT id FROM players WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
        throw new Error('Email already registered');
    }

    const [result] = await pool.execute(
        'INSERT INTO players (email, password_hash, money, bank) VALUES (?, ?, 5000, 10000)',
        [email, password],
    );

    alt.log(`[gta-mysql-core] Registered: ${email}, ID: ${(result as any).insertId}`);
    return { oderId: (result as any).insertId, email, money: 5000, bank: 10000 };
}

async function loginPlayer(email: string, password: string): Promise<PlayerSession> {
    const pool = await getMySQLPool();
    const [rows] = await pool.execute('SELECT id, email, password_hash, money, bank FROM players WHERE email = ?', [email]);
    const players = rows as any[];

    if (players.length === 0 || password !== players[0].password_hash) {
        throw new Error('Invalid email or password');
    }

    return { oderId: players[0].id, email: players[0].email, money: players[0].money, bank: players[0].bank };
}

async function savePlayerMoney(email: string, money: number, bank: number): Promise<void> {
    const pool = await getMySQLPool();
    await pool.execute('UPDATE players SET money = ?, bank = ? WHERE email = ?', [money, bank, email]);
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
    notifyPlayer(player, 'Welcome! Press T for chat, P for phone');
    notifyPlayer(player, 'Use /register <email> <password> or /login <email> <password>');

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
        await weaponService.savePlayerWeapons(player, session.oderId);
        alt.log(`[gta-mysql-core] Saved data for ${session.email}`);
    }
    playerSessions.delete(player.id);
    playersInProperty.delete(player.id);
});

// ============================================================================
// PLAYER DEATH & RESPAWN
// ============================================================================

const HOSPITAL_SPAWNS = [
    { x: 355.70, y: -596.17, z: 28.79, name: 'Pillbox Hill Medical Center' },
    { x: -449.67, y: -340.83, z: 34.50, name: 'Mount Zonah Medical Center' },
    { x: 1839.62, y: 3672.93, z: 34.28, name: 'Sandy Shores Medical Center' },
    { x: -247.76, y: 6331.23, z: 32.43, name: 'Paleto Bay Medical Center' },
];

function getNearestHospital(x: number, y: number, z: number): { x: number; y: number; z: number; name: string } {
    let nearest = HOSPITAL_SPAWNS[0];
    let minDist = Infinity;
    
    for (const hospital of HOSPITAL_SPAWNS) {
        const dist = Math.sqrt(
            Math.pow(hospital.x - x, 2) + 
            Math.pow(hospital.y - y, 2) + 
            Math.pow(hospital.z - z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = hospital;
        }
    }
    
    return nearest;
}

const HOSPITAL_FEE = 500;

alt.on('playerDeath', async (player, killer, weaponHash) => {
    const session = playerSessions.get(player.id);
    const deathPos = player.pos;
    
    alt.log(`[gta-mysql-core] Player ${player.id} died at ${deathPos.x}, ${deathPos.y}, ${deathPos.z}`);
    
    // Find nearest hospital
    const hospital = getNearestHospital(deathPos.x, deathPos.y, deathPos.z);
    
    // Respawn after a delay
    alt.setTimeout(async () => {
        if (!player.valid) return;
        
        // Respawn at hospital
        player.spawn(hospital.x, hospital.y, hospital.z, 0);
        player.health = 200;
        player.armour = 0;
        
        // Deduct hospital fee if logged in
        if (session) {
            if (session.money >= HOSPITAL_FEE) {
                session.money -= HOSPITAL_FEE;
                await savePlayerMoney(session.email, session.money, session.bank);
                syncMoneyToClient(player);
                notifyPlayer(player, `Respawned at ${hospital.name}. Hospital fee: $${HOSPITAL_FEE}`);
            } else {
                notifyPlayer(player, `Respawned at ${hospital.name}. (No fee - insufficient funds)`);
            }
            
            // Reload weapons after respawn
            await weaponService.loadWeaponsToPlayer(player, session.oderId);
        } else {
            notifyPlayer(player, `Respawned at ${hospital.name}`);
        }
        
        // Clear property state if player was inside
        playersInProperty.delete(player.id);
        
        // Emit safe spawn to client for ground check
        alt.emitClient(player, 'gta:spawn:safe', hospital.x, hospital.y, hospital.z);
    }, 5000); // 5 second respawn delay
    
    // Notify player they're dead
    notifyPlayer(player, 'You died! Respawning in 5 seconds...');
});

// ============================================================================
// PROPERTY SYSTEM - Player inside property tracking
// ============================================================================

const playersInProperty = new Map<number, number>(); // playerId -> propertyId

// ============================================================================
// CLIENT EVENT HANDLERS
// ============================================================================

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
// COMMAND HANDLER
// ============================================================================

async function handleCommand(player: alt.Player, command: string, args: string[]): Promise<void> {
    const session = playerSessions.get(player.id);

    switch (command) {
        case 'register': {
            const [email, password] = args;
            if (!email || !password) { notifyPlayer(player, 'Usage: /register <email> <password>'); return; }
            if (session) { notifyPlayer(player, 'You are already logged in'); return; }
            try {
                const newSession = await registerPlayer(email, password);
                playerSessions.set(player.id, newSession);
                player.setMeta('playerId', newSession.oderId);
                alt.emitClient(player, 'gta:playerId', newSession.oderId);
                await bindCharacterForPlayer(player, email);
                spawnPlayerSafe(player);
                syncMoneyToClient(player);
                notifyPlayer(player, `Registered! Cash: $${newSession.money}`);
            } catch (err) { notifyPlayer(player, `Error: ${(err as Error).message}`); }
            break;
        }
        case 'login': {
            const [email, password] = args;
            if (!email || !password) { notifyPlayer(player, 'Usage: /login <email> <password>'); return; }
            if (session) { notifyPlayer(player, 'You are already logged in'); return; }
            try {
                const newSession = await loginPlayer(email, password);
                playerSessions.set(player.id, newSession);
                player.setMeta('playerId', newSession.oderId);
                alt.emitClient(player, 'gta:playerId', newSession.oderId);
                await bindCharacterForPlayer(player, email);
                spawnPlayerSafe(player);
                await weaponService.loadWeaponsToPlayer(player, newSession.oderId);
                await clothingShopService.loadPlayerClothing(player, newSession.oderId);
                syncMoneyToClient(player);
                notifyPlayer(player, `Welcome back! Cash: $${newSession.money}`);
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
            player.pos = new alt.Vector3(nearbyProp.interior_x, nearbyProp.interior_y, nearbyProp.interior_z);
            playersInProperty.set(player.id, nearbyProp.id);
            notifyPlayer(player, `Entered ${nearbyProp.name}`);
            break;
        }
        case 'exit': {
            const propId = playersInProperty.get(player.id);
            if (!propId) { notifyPlayer(player, 'You are not inside a property'); return; }
            const prop = await propertyService.getPropertyById(propId);
            if (prop) {
                player.pos = new alt.Vector3(prop.pos_x, prop.pos_y, prop.pos_z);
                notifyPlayer(player, `Exited ${prop.name}`);
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
        case 'help': {
            notifyPlayer(player, '=== Commands ===');
            notifyPlayer(player, '/register, /login, /money, /givemoney, /car');
            notifyPlayer(player, '/weapons, /buyweapon <name>');
            notifyPlayer(player, '/properties, /myproperties, /buyproperty, /sellproperty');
            notifyPlayer(player, '/enter, /exit (for properties)');
            notifyPlayer(player, '/slots <bet>, /roulette <bet> <type> <value>');
            notifyPlayer(player, '/contact, /contacts, /sms');
            notifyPlayer(player, '/tp <x> <y> <z> - Teleport');
            notifyPlayer(player, '/casino - Go to casino');
            notifyPlayer(player, 'Press P for phone menu');
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
