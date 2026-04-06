import * as alt from 'alt-client';
import * as native from 'natives';

import { createMapBlips } from './blipsClient.js';
import { addNotification } from './chatPhoneClient.js';
import { PROPERTY_INTERACTION_RADIUS, PROPERTY_IPLS } from './constants.js';
import { clientState } from './state.js';
import type { PropertyLocation } from './types.js';

export function getDistanceToProperty(prop: PropertyLocation): number {
    const player = alt.Player.local;
    if (!player || !player.valid) return Infinity;
    const pos = player.pos;

    const dx = prop.pos_x - pos.x;
    const dy = prop.pos_y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestProperty(): PropertyLocation | null {
    if (clientState.properties.length === 0) return null;

    let nearest: PropertyLocation | null = null;
    let minDist = PROPERTY_INTERACTION_RADIUS;

    for (const prop of clientState.properties) {
        const dist = getDistanceToProperty(prop);
        if (dist < minDist) {
            minDist = dist;
            nearest = prop;
        }
    }

    return nearest;
}

export function openPropertyMenu(): void {
    if (clientState.propertyInteractionOpen || !clientState.nearbyProperty) return;
    clientState.propertyInteractionOpen = true;
    clientState.propertyMenuSelection = 0;
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

export function closePropertyMenu(): void {
    if (!clientState.propertyInteractionOpen) return;
    clientState.propertyInteractionOpen = false;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function handlePropertyAction(action: 'buy' | 'enter' | 'exit' | 'sell'): void {
    if (!clientState.nearbyProperty) return;

    switch (action) {
        case 'buy':
            alt.emitServer('property:buy', clientState.nearbyProperty.id);
            break;
        case 'enter':
            alt.emitServer('property:enter', clientState.nearbyProperty.id);
            break;
        case 'exit':
            alt.emitServer('property:exit', clientState.nearbyProperty.id);
            break;
        case 'sell':
            alt.emitServer('property:sell', clientState.nearbyProperty.id);
            break;
    }
    closePropertyMenu();
}

export function loadPropertyIPL(iplName: string): void {
    const ipls = PROPERTY_IPLS[iplName] || [iplName];
    ipls.forEach((ipl) => {
        if (!native.isIplActive(ipl)) {
            native.requestIpl(ipl);
            alt.log(`[gta] Loaded property IPL: ${ipl}`);
        }
    });
}

export function doPropertyInteriorTeleport(interior: { x: number; y: number; z: number; heading: number }): void {
    const player = alt.Player.local;
    if (player && player.valid) {
        alt.log(
            `[gta-client] property:enterResult teleporting to interior: ${interior.x}, ${interior.y}, ${interior.z} heading=${interior.heading}`
        );
        native.requestCollisionAtCoord(interior.x, interior.y, interior.z);
        const interiorId = native.getInteriorAtCoords(interior.x, interior.y, interior.z);
        if (interiorId !== 0) {
            native.pinInteriorInMemory(interiorId);
            native.refreshInterior(interiorId);
        }
        native.setEntityCoordsNoOffset(player.scriptID, interior.x, interior.y, interior.z, false, false, false);
        native.setEntityHeading(player.scriptID, interior.heading);
    }
}

alt.onServer('property:buyResult', (result: { success: boolean; message: string; newBalance?: number; property?: PropertyLocation }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
        if (result.newBalance !== undefined) {
            clientState.playerMoney = result.newBalance;
        }
        alt.emitServer('property:requestList');
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('property:sellResult', (result: { success: boolean; message: string; newBalance?: number }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
        if (result.newBalance !== undefined) {
            clientState.playerMoney = result.newBalance;
        }
        alt.emitServer('property:requestList');
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer(
    'property:enterResult',
    (result: { success: boolean; message: string; interior?: { x: number; y: number; z: number; heading: number; ipl?: string } }) => {
        if (result.success && result.interior) {
            if (result.interior.ipl) {
                loadPropertyIPL(result.interior.ipl);
                alt.setTimeout(() => {
                    doPropertyInteriorTeleport(result.interior!);
                    addNotification(result.message);
                }, 150);
            } else {
                doPropertyInteriorTeleport(result.interior);
                addNotification(result.message);
            }
        } else {
            addNotification(`FAILED: ${result.message}`);
        }
    }
);

alt.onServer('property:exitResult', (result: { success: boolean; message: string; exterior?: { x: number; y: number; z: number } }) => {
    if (result.success && result.exterior) {
        const player = alt.Player.local;
        if (player && player.valid) {
            native.requestCollisionAtCoord(result.exterior.x, result.exterior.y, result.exterior.z);
            native.setEntityCoordsNoOffset(
                player.scriptID,
                result.exterior.x,
                result.exterior.y,
                result.exterior.z + 1.0,
                false,
                false,
                false
            );
        }
        addNotification(result.message);
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});
