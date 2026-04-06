import * as alt from 'alt-client';
import * as native from 'natives';

import { closeAuth } from './authClient.js';
import { createMapBlips } from './blipsClient.js';
import { addNotification } from './chatPhoneClient.js';
import { CASINO_IPLS, RECONNECT_INTERVAL_MS, SAFE_SPAWN } from './constants.js';
import { clientState } from './state.js';

export async function forceSafeGroundSpawn(x: number, y: number, z: number): Promise<void> {
    const player = alt.Player.local;
    if (!player || !player.valid) return;

    alt.log(`[gta-client] forceSafeGroundSpawn received: ${x}, ${y}, ${z}`);
    native.requestCollisionAtCoord(x, y, z);

    let groundZ = z + 1.0;
    for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => alt.setTimeout(resolve, 100));
        const [found, result] = native.getGroundZFor3dCoord(x, y, z + 3, 0, false, false);
        if (found && result > 0) {
            groundZ = result + 1.0;
            alt.log(`[gta-client] forceSafeGroundSpawn ground found: groundZ=${groundZ} (attempt ${attempt + 1})`);
            break;
        }
    }

    if (groundZ === z + 1.0) {
        alt.log(`[gta-client] forceSafeGroundSpawn ground NOT found, using fallback z=${groundZ}`);
    }
    alt.log(`[gta-client] forceSafeGroundSpawn setting position: ${x}, ${y}, ${groundZ}`);
    native.setEntityCoordsNoOffset(player.scriptID, x, y, groundZ, false, false, false);
}

function loadCasinoInterior(): void {
    CASINO_IPLS.forEach((ipl) => {
        if (!native.isIplActive(ipl)) {
            native.requestIpl(ipl);
            alt.log(`[gta] Loaded IPL: ${ipl}`);
        }
    });

    const casinoInteriorId = native.getInteriorAtCoords(1100.0, 220.0, -50.0);
    if (casinoInteriorId !== 0) {
        native.pinInteriorInMemory(casinoInteriorId);
        native.refreshInterior(casinoInteriorId);
        alt.log(`[gta] Casino interior loaded: ${casinoInteriorId}`);
    }
}

export function disableAmbientPopulation(): void {
    native.setVehicleDensityMultiplierThisFrame(0.0);
    native.setRandomVehicleDensityMultiplierThisFrame(0.0);
    native.setParkedVehicleDensityMultiplierThisFrame(0.0);
    native.setPedDensityMultiplierThisFrame(0.0);
    native.setScenarioPedDensityMultiplierThisFrame(0.0, 0.0);
    native.setGarbageTrucks(false);
    native.setRandomBoats(false);
    native.setRandomTrains(false);
}

function disablePopulationOnce(): void {
    native.setPedPopulationBudget(0);
    native.setVehiclePopulationBudget(0);
    native.setRandomEventFlag(false);
    native.setCreateRandomCops(false);
    native.setCreateRandomCopsNotOnScenarios(false);
    native.setCreateRandomCopsOnScenarios(false);
    native.enableDispatchService(1, false);
    native.enableDispatchService(2, false);
    native.enableDispatchService(3, false);
    native.enableDispatchService(4, false);
    native.enableDispatchService(5, false);
    native.enableDispatchService(6, false);
    alt.log('[gta] AI population disabled - GTA Online style');
}

function tryReconnect(): void {
    clientState.reconnectAttempts += 1;
    alt.log(`[gta-client] Reconnect attempt ${clientState.reconnectAttempts}`);
    try {
        const altAny = alt as unknown as { reconnect?: () => void };
        if (typeof altAny.reconnect === 'function') {
            altAny.reconnect();
        }
    } catch (_) {
        // no reconnect API
    }
}

function scheduleReconnect(): void {
    if (clientState.reconnectTimer != null) return;
    clientState.reconnectTimer = alt.setInterval(() => {
        tryReconnect();
    }, RECONNECT_INTERVAL_MS);
}

alt.onServer('gta:playerId', (id: number) => {
    clientState.currentPlayerId = id;
});

alt.onServer('gta:logout', () => {
    clientState.isLoggedIn = false;
    clientState.authRequirePasswordChange = false;
    clientState.currentPlayerId = 0;
    clientState.playerMoney = 0;
    clientState.playerBank = 0;
    clientState.properties = [];
    createMapBlips();
    if (clientState.authOpen) closeAuth();
    addNotification('Logged out successfully');
});

alt.onServer('gta:money:update', (money: number, bank: number) => {
    clientState.playerMoney = money;
    clientState.playerBank = bank;
    if (!clientState.isLoggedIn) {
        clientState.isLoggedIn = true;
        alt.emitServer('property:requestList');
    }
});

alt.onServer('gta:spawn:safe', (x?: number, y?: number, z?: number) => {
    clientState.isDead = false;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
        forceSafeGroundSpawn(x, y, z).catch(() => {});
    }
});

alt.on('connectionComplete', () => {
    clientState.isDisconnected = false;
    clientState.reconnectAttempts = 0;
    if (clientState.reconnectTimer != null) {
        alt.clearInterval(clientState.reconnectTimer);
        clientState.reconnectTimer = null;
    }
    alt.log('[gta-client] Connection complete');
    alt.loadDefaultIpls();
    loadCasinoInterior();
    disablePopulationOnce();
    native.requestCollisionAtCoord(924.0, 46.0, 81.1);
});

alt.on('disconnect', () => {
    clientState.isDisconnected = true;
    alt.log('[gta-client] Disconnected - will try to reconnect');
    tryReconnect();
    scheduleReconnect();
});

export { SAFE_SPAWN };
