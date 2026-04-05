import * as alt from 'alt-client';
import * as native from 'natives';

import { getActiveAuthFieldKey } from './authClient';
import {
    DEALERSHIP_INTERACTION_RADIUS,
    NAMETAG_HEAD_OFFSET_Z,
    NAMETAG_MAX_DIST_SQ,
    NAMETAG_SYNCED_META,
    PROPERTY_INTERACTION_RADIUS,
    RESPAWN_DELAY,
    SHOP_INTERACTION_RADIUS,
    SHOP_PAGE_SIZE,
    VEHICLE_DEALERSHIPS,
    VEHICLE_PAGE_SIZE,
} from './constants';
import { findNearestDealership, findNearestShop } from './commerceClient';
import { getDistanceToProperty, findNearestProperty } from './propertyClient';
import { clientState } from './state';

export function drawText(text: string, x: number, y: number, scale: number, r: number, g: number, b: number, center = false): void {
    native.setTextFont(4);
    native.setTextScale(scale, scale);
    native.setTextColour(r, g, b, 255);
    native.setTextOutline();
    if (center) native.setTextCentre(true);
    else {
        native.setTextRightJustify(true);
        native.setTextWrap(0, x);
    }
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(text);
    native.endTextCommandDisplayText(x, y, 0);
}

export function drawTextLeft(text: string, x: number, y: number, scale: number, r: number, g: number, b: number): void {
    native.setTextFont(4);
    native.setTextScale(scale, scale);
    native.setTextColour(r, g, b, 255);
    native.setTextOutline();
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(text);
    native.endTextCommandDisplayText(x, y, 0);
}

export function drawPlayerNametags(): void {
    const local = alt.Player.local;
    if (!local?.valid) return;

    for (const p of alt.Player.streamedIn) {
        if (!p.valid || p === local) continue;

        const raw = p.getSyncedMeta(NAMETAG_SYNCED_META);
        const label =
            typeof raw === 'string' && raw.length > 0
                ? raw.length > 32
                    ? `${raw.slice(0, 29)}...`
                    : raw
                : `Player ${p.id}`;

        const pos = p.pos;
        const wx = pos.x;
        const wy = pos.y;
        const wz = pos.z + NAMETAG_HEAD_OFFSET_Z;
        const dx = local.pos.x - wx;
        const dy = local.pos.y - wy;
        const dz = local.pos.z - wz;
        if (dx * dx + dy * dy + dz * dz > NAMETAG_MAX_DIST_SQ) continue;

        const [onScreen, sx, sy] = native.getScreenCoordFromWorldCoord(wx, wy, wz, 0, 0);
        if (!onScreen) continue;

        native.setTextFont(4);
        native.setTextScale(0.32, 0.32);
        native.setTextColour(255, 255, 255, 220);
        native.setTextOutline();
        native.setTextCentre(true);
        native.beginTextCommandDisplayText('STRING');
        native.addTextComponentSubstringPlayerName(label);
        native.endTextCommandDisplayText(sx, sy, 0);
    }
}

export function drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    native.drawRect(x, y, w, h, r, g, b, a, false);
}

export function drawPropertyMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    clientState.nearbyProperty = findNearestProperty();

    clientState.properties.forEach((prop) => {
        const dist = getDistanceToProperty(prop);

        if (dist < 50) {
            const isForSale = prop.owner_player_id === null;
            const isOwned = prop.owner_player_id === clientState.currentPlayerId;

            let color: [number, number, number];
            if (isForSale) {
                color = [100, 255, 100];
            } else if (isOwned) {
                color = [100, 100, 255];
            } else {
                color = [150, 150, 150];
            }

            native.drawMarker(
                27,
                prop.pos_x,
                prop.pos_y,
                prop.pos_z + 0.01,
                0,
                0,
                0,
                0,
                0,
                0,
                1.5,
                1.5,
                1.0,
                color[0],
                color[1],
                color[2],
                200,
                false,
                false,
                2,
                false,
                null as any,
                null as any,
                false
            );

            native.drawMarker(
                5,
                prop.pos_x,
                prop.pos_y,
                prop.pos_z + 2.5,
                0,
                0,
                0,
                0,
                180.0,
                0,
                0.6,
                0.6,
                0.6,
                color[0],
                color[1],
                color[2],
                200,
                true,
                true,
                2,
                true,
                null as any,
                null as any,
                false
            );

            if (dist < 15) {
                native.setTextFont(4);
                native.setTextScale(0.4, 0.4);
                native.setTextColour(255, 255, 255, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(prop.pos_x, prop.pos_y, prop.pos_z + 3.0, false);
                native.beginTextCommandDisplayText('STRING');

                let label = prop.name;
                if (isForSale) {
                    label += `~n~$${prop.price.toLocaleString()}~n~~g~FOR SALE`;
                } else if (isOwned) {
                    label += '~n~~b~YOUR PROPERTY';
                } else {
                    label += '~n~~r~SOLD';
                }

                native.addTextComponentSubstringPlayerName(label);
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }

            if (dist < PROPERTY_INTERACTION_RADIUS && !clientState.propertyInteractionOpen) {
                native.setTextFont(4);
                native.setTextScale(0.35, 0.35);
                native.setTextColour(255, 255, 0, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(prop.pos_x, prop.pos_y, prop.pos_z + 1.0, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName('Press E to interact');
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }
        }
    });
}

export function drawShopMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    const nearestResult = findNearestShop();
    clientState.nearbyShop = nearestResult ? nearestResult.shop : null;
    clientState.nearbyShopType = nearestResult ? nearestResult.type : null;

    [...clientState.weaponShops, ...clientState.clothingShops, ...clientState.casinos].forEach((shop) => {
        const dx = shop.x - pos.x;
        const dy = shop.y - pos.y;
        const dist2d = Math.sqrt(dx * dx + dy * dy);

        if (dist2d < 50) {
            const isWeapon = clientState.weaponShops.includes(shop);
            const isClothing = clientState.clothingShops.includes(shop);
            const color = isWeapon ? [255, 100, 100] : isClothing ? [100, 100, 255] : [255, 215, 0];

            native.drawMarker(
                1,
                shop.x,
                shop.y,
                shop.z - 1.0,
                0,
                0,
                0,
                0,
                0,
                0,
                0.8,
                0.8,
                2.0,
                color[0],
                color[1],
                color[2],
                100,
                false,
                false,
                2,
                false,
                null as any,
                null as any,
                false
            );

            if (dist2d < 20) {
                native.setTextFont(4);
                native.setTextScale(0.4, 0.4);
                native.setTextColour(255, 255, 255, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(shop.x, shop.y, shop.z + 1.0, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName(shop.name);
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }

            if (dist2d < SHOP_INTERACTION_RADIUS) {
                native.setTextFont(4);
                native.setTextScale(0.35, 0.35);
                native.setTextColour(255, 255, 0, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(shop.x, shop.y, shop.z + 1.0, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName('Press E to enter shop');
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }
        }
    });
}

export function drawDealershipMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    clientState.nearbyDealership = findNearestDealership();

    VEHICLE_DEALERSHIPS.forEach((dealership) => {
        const dx = dealership.x - pos.x;
        const dy = dealership.y - pos.y;
        const dist2d = Math.sqrt(dx * dx + dy * dy);

        if (dist2d < 50) {
            native.drawMarker(
                1,
                dealership.x,
                dealership.y,
                dealership.z - 1.0,
                0,
                0,
                0,
                0,
                0,
                0,
                1.5,
                1.5,
                2.0,
                255,
                200,
                100,
                100,
                false,
                false,
                2,
                false,
                null as any,
                null as any,
                false
            );

            if (dist2d < 30) {
                native.setTextFont(4);
                native.setTextScale(0.5, 0.5);
                native.setTextColour(255, 200, 100, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(dealership.x, dealership.y, dealership.z + 2.0, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName(dealership.name);
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }

            if (dist2d < DEALERSHIP_INTERACTION_RADIUS) {
                native.setTextFont(4);
                native.setTextScale(0.4, 0.4);
                native.setTextColour(255, 255, 0, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(dealership.x, dealership.y, dealership.z + 1.0, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName('Press E to browse vehicles');
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }
        }
    });
}

export function drawPropertyMenu(): void {
    if (!clientState.propertyInteractionOpen || !clientState.nearbyProperty) return;

    const prop = clientState.nearbyProperty;
    const isForSale = prop.owner_player_id === null;
    const isOwned = prop.owner_player_id === clientState.currentPlayerId;

    drawRect(0.5, 0.5, 0.3, 0.35, 20, 20, 30, 230);

    drawTextLeft(prop.name, 0.38, 0.36, 0.5, 255, 200, 100);

    if (isForSale) {
        drawTextLeft(`Price: $${prop.price.toLocaleString()}`, 0.38, 0.42, 0.4, 100, 255, 100);
        drawTextLeft(`Your money: $${clientState.playerMoney.toLocaleString()}`, 0.38, 0.46, 0.35, 200, 200, 200);
    } else if (isOwned) {
        drawTextLeft('You own this property', 0.38, 0.42, 0.4, 100, 100, 255);
        drawTextLeft(`Sell value: $${Math.floor(prop.price * 0.7).toLocaleString()}`, 0.38, 0.46, 0.35, 200, 200, 200);
    } else {
        drawTextLeft('This property is owned', 0.38, 0.42, 0.4, 255, 100, 100);
    }

    let yPos = 0.52;
    if (isForSale) {
        const canAfford = clientState.playerMoney >= prop.price;
        const buyColor = canAfford ? [100, 255, 100] : [150, 150, 150];
        drawTextLeft('[1] Buy Property', 0.38, yPos, 0.4, buyColor[0], buyColor[1], buyColor[2]);
        yPos += 0.04;
    }

    if (isOwned) {
        drawTextLeft('[2] Enter Property', 0.38, yPos, 0.4, 100, 200, 255);
        yPos += 0.04;
        drawTextLeft('[3] Sell Property', 0.38, yPos, 0.4, 255, 150, 100);
        yPos += 0.04;
        drawTextLeft('[4] Open Garage', 0.38, yPos, 0.4, 255, 200, 100);
        yPos += 0.04;
    }

    drawTextLeft('[ESC] Close', 0.38, 0.65, 0.35, 150, 150, 150);
}

export function drawDealershipMenu(): void {
    if (!clientState.dealershipMenuOpen) return;

    drawRect(0.5, 0.5, 0.4, 0.55, 20, 20, 30, 230);

    drawTextLeft('VEHICLE DEALERSHIP', 0.33, 0.27, 0.6, 255, 200, 100);
    drawTextLeft(`Your money: $${clientState.playerMoney.toLocaleString()}`, 0.33, 0.32, 0.35, 200, 200, 200);

    if (clientState.vehicleCatalog.length === 0) {
        drawTextLeft('Loading vehicles...', 0.33, 0.4, 0.4, 200, 200, 200);
    } else {
        const startIdx = Math.floor(clientState.vehicleMenuSelection / VEHICLE_PAGE_SIZE) * VEHICLE_PAGE_SIZE;
        const endIdx = Math.min(startIdx + VEHICLE_PAGE_SIZE, clientState.vehicleCatalog.length);

        let yPos = 0.37;
        for (let i = startIdx; i < endIdx; i++) {
            const vehicle = clientState.vehicleCatalog[i];
            const isSelected = i === clientState.vehicleMenuSelection;
            const canAfford = clientState.playerMoney >= vehicle.price;
            const color = isSelected ? [255, 255, 100] : canAfford ? [200, 200, 200] : [100, 100, 100];

            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.38, 0.035, 60, 60, 80, 200);
            }

            const priceStr = `$${vehicle.price.toLocaleString()}`;
            drawTextLeft(`${vehicle.name} (${vehicle.category})`, 0.33, yPos, 0.35, color[0], color[1], color[2]);
            drawTextLeft(priceStr, 0.62, yPos, 0.35, color[0], color[1], color[2]);
            yPos += 0.04;
        }

        const totalPages = Math.ceil(clientState.vehicleCatalog.length / VEHICLE_PAGE_SIZE);
        const currentPage = Math.floor(clientState.vehicleMenuSelection / VEHICLE_PAGE_SIZE) + 1;
        drawTextLeft(`Page ${currentPage}/${totalPages}`, 0.33, 0.7, 0.3, 150, 150, 150);
    }

    drawTextLeft('[W/S] Navigate  [E/Enter] Buy  [ESC] Close', 0.33, 0.74, 0.3, 150, 150, 150);
}

export function drawGarageMenu(): void {
    if (!clientState.garageMenuOpen) return;

    drawRect(0.5, 0.5, 0.35, 0.45, 20, 20, 30, 230);

    drawTextLeft('GARAGE', 0.36, 0.32, 0.6, 255, 200, 100);

    if (clientState.garageVehicles.length === 0) {
        drawTextLeft('No vehicles in garage', 0.36, 0.42, 0.4, 200, 200, 200);
    } else {
        let yPos = 0.4;
        for (let i = 0; i < clientState.garageVehicles.length; i++) {
            const vehicle = clientState.garageVehicles[i];
            const isSelected = i === clientState.garageMenuSelection;
            const color = isSelected ? [255, 255, 100] : [200, 200, 200];

            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.33, 0.035, 60, 60, 80, 200);
            }

            drawTextLeft(`${vehicle.model}`, 0.36, yPos, 0.4, color[0], color[1], color[2]);
            yPos += 0.04;
        }
    }

    const storeSelected = clientState.garageMenuSelection === clientState.garageVehicles.length;
    const storeColor = storeSelected ? [255, 255, 100] : [100, 200, 100];
    if (storeSelected) {
        drawRect(0.5, 0.6 + 0.015, 0.33, 0.035, 60, 60, 80, 200);
    }
    drawTextLeft('[+] Store nearby vehicle', 0.36, 0.6, 0.4, storeColor[0], storeColor[1], storeColor[2]);

    drawTextLeft('[W/S] Navigate  [E/Enter] Spawn/Store  [ESC] Close', 0.36, 0.7, 0.28, 150, 150, 150);
}

export function drawShopMenuUi(): void {
    if (!clientState.shopMenuOpen) return;

    const title = clientState.shopMenuType === 'weapon' ? 'AMMU-NATION' : 'CLOTHING STORE';
    const titleColor = clientState.shopMenuType === 'weapon' ? [255, 100, 100] : [100, 100, 255];

    drawRect(0.5, 0.5, 0.35, 0.5, 20, 20, 30, 230);

    drawTextLeft(title, 0.36, 0.3, 0.6, titleColor[0], titleColor[1], titleColor[2]);

    if (clientState.shopCatalog.length === 0) {
        drawTextLeft('Loading...', 0.36, 0.4, 0.4, 200, 200, 200);
    } else {
        const startIdx = Math.floor(clientState.shopMenuSelection / SHOP_PAGE_SIZE) * SHOP_PAGE_SIZE;
        const endIdx = Math.min(startIdx + SHOP_PAGE_SIZE, clientState.shopCatalog.length);

        let yPos = 0.38;
        for (let i = startIdx; i < endIdx; i++) {
            const item = clientState.shopCatalog[i];
            const isSelected = i === clientState.shopMenuSelection;
            const color = isSelected ? [255, 255, 100] : [200, 200, 200];

            const itemText = `${item.name} - $${item.price.toLocaleString()}`;

            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.33, 0.035, 60, 60, 80, 200);
            }

            drawTextLeft(itemText, 0.36, yPos, 0.35, color[0], color[1], color[2]);
            yPos += 0.04;
        }

        const totalPages = Math.ceil(clientState.shopCatalog.length / SHOP_PAGE_SIZE);
        const currentPage = Math.floor(clientState.shopMenuSelection / SHOP_PAGE_SIZE) + 1;
        drawTextLeft(`Page ${currentPage}/${totalPages}`, 0.36, 0.65, 0.3, 150, 150, 150);
    }

    drawTextLeft('[W/S] Navigate  [E/Enter] Buy  [ESC] Close', 0.36, 0.7, 0.3, 150, 150, 150);
}

export function drawDeathScreen(): void {
    if (!clientState.isDead) return;

    const elapsed = Date.now() - clientState.deathTime;
    const remaining = Math.max(0, RESPAWN_DELAY - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    drawRect(0.5, 0.5, 1.0, 1.0, 0, 0, 0, 180);

    native.setTextFont(4);
    native.setTextScale(1.0, 1.0);
    native.setTextColour(255, 50, 50, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName('WASTED');
    native.endTextCommandDisplayText(0.5, 0.4, 0);

    native.setTextFont(4);
    native.setTextScale(0.5, 0.5);
    native.setTextColour(255, 255, 255, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    if (remaining > 0) {
        native.addTextComponentSubstringPlayerName(`Respawning at hospital in ${seconds}...`);
    } else {
        native.addTextComponentSubstringPlayerName('Respawning...');
    }
    native.endTextCommandDisplayText(0.5, 0.5, 0);

    native.setTextFont(4);
    native.setTextScale(0.35, 0.35);
    native.setTextColour(200, 200, 200, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName('Hospital fee: $500');
    native.endTextCommandDisplayText(0.5, 0.55, 0);
}

export function drawAuthOverlay(): void {
    const panelW = 0.32;
    const panelH = clientState.authScreen === 'menu' ? 0.36 : 0.52;
    drawRect(0.5, 0.5, panelW, panelH, 25, 25, 35, 245);
    drawTextLeft(
        clientState.authRequirePasswordChange ? 'CHANGE PASSWORD (required)' : 'ACCOUNT',
        0.36,
        0.28,
        0.5,
        100,
        200,
        255
    );

    const f = clientState.authForm;
    const gk = getActiveAuthFieldKey();

    if (clientState.authScreen === 'menu') {
        drawTextLeft('[1] Login', 0.36, 0.36, 0.4, 255, 255, 255);
        drawTextLeft('[2] Register', 0.36, 0.42, 0.4, 255, 255, 255);
        drawTextLeft('[3] Forgot Password', 0.36, 0.48, 0.4, 255, 255, 255);
        if (clientState.currentPlayerId > 0) drawTextLeft('[4] Logout', 0.36, 0.54, 0.4, 255, 180, 180);
        drawTextLeft('[ESC] Close', 0.36, clientState.currentPlayerId > 0 ? 0.62 : 0.58, 0.35, 150, 150, 150);
    } else if (clientState.authScreen === 'login') {
        drawTextLeft('Username or Email:', 0.36, 0.34, 0.35, 200, 200, 200);
        drawRect(0.5, 0.395, 0.26, 0.032, gk === 'loginId' ? 60 : 40, gk === 'loginId' ? 60 : 40, gk === 'loginId' ? 90 : 55, 255);
        drawTextLeft(f.loginId + (gk === 'loginId' ? '_' : ''), 0.37, 0.385, 0.35, 255, 255, 255);
        drawTextLeft('Password:', 0.36, 0.44, 0.35, 200, 200, 200);
        drawRect(
            0.5,
            0.495,
            0.26,
            0.032,
            gk === 'loginPassword' ? 60 : 40,
            gk === 'loginPassword' ? 60 : 40,
            gk === 'loginPassword' ? 90 : 55,
            255
        );
        drawTextLeft('*'.repeat(f.loginPassword.length) + (gk === 'loginPassword' ? '_' : ''), 0.37, 0.485, 0.35, 255, 255, 255);
        if (clientState.authMessage) drawTextLeft(clientState.authMessage, 0.36, 0.55, 0.3, 255, 200, 100);
        drawTextLeft('[TAB] Next | [ENTER] Login | [ESC] Back', 0.36, 0.62, 0.28, 150, 150, 150);
    } else if (clientState.authScreen === 'register') {
        drawTextLeft('Username:', 0.36, 0.32, 0.32, 200, 200, 200);
        drawRect(0.5, 0.355, 0.26, 0.028, gk === 'regUsername' ? 60 : 40, gk === 'regUsername' ? 60 : 40, gk === 'regUsername' ? 90 : 55, 255);
        drawTextLeft(f.regUsername + (gk === 'regUsername' ? '_' : ''), 0.37, 0.348, 0.32, 255, 255, 255);
        drawTextLeft('Email:', 0.36, 0.39, 0.32, 200, 200, 200);
        drawRect(0.5, 0.425, 0.26, 0.028, gk === 'regEmail' ? 60 : 40, gk === 'regEmail' ? 60 : 40, gk === 'regEmail' ? 90 : 55, 255);
        drawTextLeft(f.regEmail + (gk === 'regEmail' ? '_' : ''), 0.37, 0.418, 0.32, 255, 255, 255);
        drawTextLeft('Password:', 0.36, 0.46, 0.32, 200, 200, 200);
        drawRect(0.5, 0.495, 0.26, 0.028, gk === 'regPassword' ? 60 : 40, gk === 'regPassword' ? 60 : 40, gk === 'regPassword' ? 90 : 55, 255);
        drawTextLeft('*'.repeat(f.regPassword.length) + (gk === 'regPassword' ? '_' : ''), 0.37, 0.488, 0.32, 255, 255, 255);
        drawTextLeft('Confirm Password:', 0.36, 0.53, 0.32, 200, 200, 200);
        drawRect(0.5, 0.565, 0.26, 0.028, gk === 'regConfirm' ? 60 : 40, gk === 'regConfirm' ? 60 : 40, gk === 'regConfirm' ? 90 : 55, 255);
        drawTextLeft('*'.repeat(f.regConfirm.length) + (gk === 'regConfirm' ? '_' : ''), 0.37, 0.558, 0.32, 255, 255, 255);
        if (clientState.authMessage) drawTextLeft(clientState.authMessage, 0.36, 0.6, 0.28, 255, 200, 100);
        drawTextLeft('[TAB] Next | [ENTER] Register | [ESC] Back', 0.36, 0.66, 0.28, 150, 150, 150);
    } else if (clientState.authScreen === 'forgot') {
        drawTextLeft('Enter your registered email:', 0.36, 0.36, 0.35, 200, 200, 200);
        drawRect(0.5, 0.415, 0.26, 0.032, gk === 'forgotEmail' ? 60 : 40, gk === 'forgotEmail' ? 60 : 40, gk === 'forgotEmail' ? 90 : 55, 255);
        drawTextLeft(f.forgotEmail + (gk === 'forgotEmail' ? '_' : ''), 0.37, 0.405, 0.35, 255, 255, 255);
        if (clientState.authMessage) drawTextLeft(clientState.authMessage, 0.36, 0.48, 0.3, 255, 200, 100);
        drawTextLeft('[ENTER] Send reset | [ESC] Back', 0.36, 0.56, 0.28, 150, 150, 150);
    } else if (clientState.authScreen === 'changePassword') {
        drawTextLeft(
            clientState.authRequirePasswordChange ? 'Enter temporary (or current) password:' : 'Current password:',
            0.36,
            0.34,
            0.32,
            200,
            200,
            200
        );
        drawRect(0.5, 0.395, 0.26, 0.032, gk === 'changeCurrent' ? 60 : 40, gk === 'changeCurrent' ? 60 : 40, gk === 'changeCurrent' ? 90 : 55, 255);
        drawTextLeft('*'.repeat(f.changeCurrent.length) + (gk === 'changeCurrent' ? '_' : ''), 0.37, 0.385, 0.32, 255, 255, 255);
        drawTextLeft('New password:', 0.36, 0.44, 0.32, 200, 200, 200);
        drawRect(0.5, 0.495, 0.26, 0.032, gk === 'changeNew' ? 60 : 40, gk === 'changeNew' ? 60 : 40, gk === 'changeNew' ? 90 : 55, 255);
        drawTextLeft('*'.repeat(f.changeNew.length) + (gk === 'changeNew' ? '_' : ''), 0.37, 0.485, 0.32, 255, 255, 255);
        drawTextLeft('Confirm new password:', 0.36, 0.54, 0.32, 200, 200, 200);
        drawRect(0.5, 0.595, 0.26, 0.032, gk === 'changeConfirm' ? 60 : 40, gk === 'changeConfirm' ? 60 : 40, gk === 'changeConfirm' ? 90 : 55, 255);
        drawTextLeft('*'.repeat(f.changeConfirm.length) + (gk === 'changeConfirm' ? '_' : ''), 0.37, 0.585, 0.32, 255, 255, 255);
        if (clientState.authMessage) drawTextLeft(clientState.authMessage, 0.36, 0.64, 0.28, 255, 200, 100);
        drawTextLeft('[TAB] Next | [ENTER] Change | [ESC] Back', 0.36, 0.7, 0.28, 150, 150, 150);
    }
}
