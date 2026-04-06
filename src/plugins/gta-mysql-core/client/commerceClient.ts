import * as alt from 'alt-client';

import { addNotification } from './chatPhoneClient.js';
import { DEALERSHIP_INTERACTION_RADIUS, SHOP_INTERACTION_RADIUS, VEHICLE_DEALERSHIPS } from './constants.js';
import { clientState } from './state.js';
import type { ShopLocation, VehicleCatalogItem, PlayerVehicle } from './types.js';

export function openShopMenu(type: 'weapon' | 'clothing'): void {
    clientState.shopMenuOpen = true;
    clientState.shopMenuType = type;
    clientState.shopMenuSelection = 0;
    clientState.shopCatalog = [];
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

export function closeShopMenu(): void {
    clientState.shopMenuOpen = false;
    clientState.shopMenuType = null;
    clientState.shopCatalog = [];
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function handleShopMenuKey(key: number): void {
    if (key === 27) {
        closeShopMenu();
        return;
    }

    if (key === 38 || key === 87) {
        if (clientState.shopMenuSelection > 0) clientState.shopMenuSelection--;
        return;
    }

    if (key === 40 || key === 83) {
        if (clientState.shopMenuSelection < clientState.shopCatalog.length - 1) clientState.shopMenuSelection++;
        return;
    }

    if (key === 13 || key === 69) {
        if (clientState.shopCatalog.length > 0 && clientState.shopMenuSelection < clientState.shopCatalog.length) {
            const item = clientState.shopCatalog[clientState.shopMenuSelection];
            if (clientState.shopMenuType === 'weapon') {
                alt.emitServer('weaponshop:buy', item.hash);
            } else if (clientState.shopMenuType === 'clothing') {
                alt.emitServer('clothingshop:buy', item.component, item.drawable, item.texture);
            }
        }
        return;
    }
}

export function findNearestShop(): { shop: ShopLocation; type: 'weapon' | 'clothing' | 'casino' } | null {
    const player = alt.Player.local;
    if (!player || !player.valid) return null;
    const pos = player.pos;

    let nearest: { shop: ShopLocation; type: 'weapon' | 'clothing' | 'casino' } | null = null;
    let minDist = SHOP_INTERACTION_RADIUS;

    const checkList: { list: ShopLocation[]; type: 'weapon' | 'clothing' | 'casino' }[] = [
        { list: clientState.weaponShops, type: 'weapon' },
        { list: clientState.clothingShops, type: 'clothing' },
        { list: clientState.casinos, type: 'casino' },
    ];

    for (const { list, type } of checkList) {
        for (const shop of list) {
            const dx = shop.x - pos.x;
            const dy = shop.y - pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = { shop, type };
            }
        }
    }

    return nearest;
}

export function findNearestDealership(): ShopLocation | null {
    const player = alt.Player.local;
    if (!player || !player.valid) return null;
    const pos = player.pos;

    let nearest: ShopLocation | null = null;
    let minDist = DEALERSHIP_INTERACTION_RADIUS;

    for (const dealership of VEHICLE_DEALERSHIPS) {
        const dx = dealership.x - pos.x;
        const dy = dealership.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
            minDist = dist;
            nearest = dealership;
        }
    }

    return nearest;
}

export function openDealershipMenu(): void {
    clientState.dealershipMenuOpen = true;
    clientState.vehicleMenuSelection = 0;
    clientState.vehicleCatalog = [];
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('vehicle:getCatalog');
}

export function closeDealershipMenu(): void {
    clientState.dealershipMenuOpen = false;
    clientState.vehicleCatalog = [];
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function handleDealershipMenuKey(key: number): void {
    if (key === 27) {
        closeDealershipMenu();
        return;
    }
    if (key === 38 || key === 87) {
        if (clientState.vehicleMenuSelection > 0) clientState.vehicleMenuSelection--;
        return;
    }
    if (key === 40 || key === 83) {
        if (clientState.vehicleMenuSelection < clientState.vehicleCatalog.length - 1) clientState.vehicleMenuSelection++;
        return;
    }
    if (key === 13 || key === 69) {
        if (clientState.vehicleCatalog.length > 0 && clientState.vehicleMenuSelection < clientState.vehicleCatalog.length) {
            const vehicle = clientState.vehicleCatalog[clientState.vehicleMenuSelection];
            alt.emitServer('vehicle:buy', vehicle.model, vehicle.hash, vehicle.price);
        }
        return;
    }
}

export function openGarageMenu(propertyId: number): void {
    clientState.garageMenuOpen = true;
    clientState.garageMenuSelection = 0;
    clientState.garageVehicles = [];
    clientState.currentGaragePropertyId = propertyId;
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('vehicle:getGarageVehicles', propertyId);
}

export function closeGarageMenu(): void {
    clientState.garageMenuOpen = false;
    clientState.garageVehicles = [];
    clientState.currentGaragePropertyId = null;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

export function handleGarageMenuKey(key: number): void {
    if (key === 27) {
        closeGarageMenu();
        return;
    }
    if (key === 38 || key === 87) {
        if (clientState.garageMenuSelection > 0) clientState.garageMenuSelection--;
        return;
    }
    if (key === 40 || key === 83) {
        if (clientState.garageMenuSelection < clientState.garageVehicles.length) clientState.garageMenuSelection++;
        return;
    }
    if (key === 13 || key === 69) {
        if (clientState.garageMenuSelection === clientState.garageVehicles.length) {
            if (clientState.currentGaragePropertyId) {
                alt.emitServer('vehicle:storeNearby', clientState.currentGaragePropertyId);
            }
        } else if (clientState.garageVehicles.length > 0 && clientState.garageMenuSelection < clientState.garageVehicles.length) {
            const vehicle = clientState.garageVehicles[clientState.garageMenuSelection];
            if (clientState.currentGaragePropertyId) {
                alt.emitServer('vehicle:spawnFromGarage', vehicle.id, clientState.currentGaragePropertyId);
            }
        }
        return;
    }
}

alt.onServer('weaponshop:catalog', (catalog: any[]) => {
    clientState.shopCatalog = catalog;
    alt.log(`[gta] Received weapon catalog: ${catalog.length} items`);
});

alt.onServer('clothingshop:catalog', (catalog: any[]) => {
    clientState.shopCatalog = catalog;
    alt.log(`[gta] Received clothing catalog: ${catalog.length} items`);
});

alt.onServer('vehicle:catalog', (catalog: VehicleCatalogItem[]) => {
    clientState.vehicleCatalog = catalog;
    alt.log(`[gta] Received vehicle catalog: ${catalog.length} vehicles`);
});

alt.onServer('vehicle:buyResult', (result: { success: boolean; message: string }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('vehicle:sellResult', (result: { success: boolean; message: string }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('vehicle:garageVehicles', (vehicles: PlayerVehicle[]) => {
    clientState.garageVehicles = vehicles;
    alt.log(`[gta] Received ${vehicles.length} garage vehicles`);
});
