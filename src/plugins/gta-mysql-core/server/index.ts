import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import mysql from 'mysql2/promise';
import { createGameplayMysqlBundle } from './bootstrap/createGameplayMysqlBundle.js';
import { handleChatCommand, type ChatCommandDeps } from './commands/handleChatCommand.js';
import { registerAuthClientEvents } from './events/registerAuthClientEvents.js';
import { registerCasinoClientEvents } from './events/registerCasinoClientEvents.js';
import { registerChatClientEvents } from './events/registerChatClientEvents.js';
import { registerDiagnosticsClientEvents } from './events/registerDiagnosticsClientEvents.js';
import { registerClothingShopClientEvents } from './events/registerClothingShopClientEvents.js';
import { registerPhoneClientEvents } from './events/registerPhoneClientEvents.js';
import { registerPlayerLifecycleEvents } from './events/registerPlayerLifecycleEvents.js';
import { registerPropertyClientEvents } from './events/registerPropertyClientEvents.js';
import { registerVehicleClientEvents } from './events/registerVehicleClientEvents.js';
import { registerWeaponShopClientEvents } from './events/registerWeaponShopClientEvents.js';
import { createPlayerRuntime } from './runtime/createPlayerRuntime.js';
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
import { spawnStaticParkedVehicles } from './world/spawnStaticParkedVehicles.js';

const Rebar = useRebar();
const db = Rebar.database.useDatabase();
const messenger = Rebar.messenger.useMessenger();

// ============================================================================
// MySQL CONNECTION & SERVICES
// ============================================================================

let mysqlPool: mysql.Pool | null = null;
let weaponService!: PlayerWeaponService;
let propertyService!: PropertyService;
let weaponShopService!: WeaponShopService;
let clothingShopService!: ClothingShopService;
let phoneService!: PhoneService;
let casinoService!: CasinoService;
let vehicleService!: VehicleService;
let authService!: AuthService;
let appearanceService!: AppearanceService;

async function getMySQLPool(): Promise<mysql.Pool> {
    if (mysqlPool) return mysqlPool;

    const b = await createGameplayMysqlBundle();
    mysqlPool = b.pool;
    weaponService = b.weaponService;
    propertyService = b.propertyService;
    weaponShopService = b.weaponShopService;
    clothingShopService = b.clothingShopService;
    phoneService = b.phoneService;
    casinoService = b.casinoService;
    vehicleService = b.vehicleService;
    authService = b.authService;
    appearanceService = b.appearanceService;

    return mysqlPool;
}

// ============================================================================
// PLAYER SESSION
// ============================================================================

const playerSessions = new Map<number, PlayerSession>();
const playersInProperty = new Map<number, number>(); // playerId -> propertyId

const {
    applyCharacterLook,
    clamp,
    saveAndApplyAppearance,
    completeLogin,
    savePlayerMoney,
    clearExistingSession,
    spawnPlayerSafe,
    notifyPlayer,
    syncMoneyToClient,
    broadcastPropertyUpdate,
} = createPlayerRuntime({
    playerSessions,
    playersInProperty,
    getMySQLPool,
    rebar: Rebar,
    db,
    services: {
        weapon: () => weaponService,
        vehicle: () => vehicleService,
        property: () => propertyService,
        appearance: () => appearanceService,
        clothingShop: () => clothingShopService,
    },
});

// ============================================================================
// EVENT REGISTRATION (lifecycle, client RPCs, chat commands)
// ============================================================================

registerDiagnosticsClientEvents();

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

spawnStaticParkedVehicles();

alt.log('[gta-mysql-core] Plugin loaded - Full gameplay systems');
