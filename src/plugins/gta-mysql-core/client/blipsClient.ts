import * as alt from 'alt-client';
import * as native from 'natives';

import { BLIP_SPRITES, HOSPITALS, VEHICLE_DEALERSHIPS } from './constants';
import { clientState } from './state';
import type { PropertyLocation, ShopLocation } from './types';

export function createMapBlips(): void {
    clientState.createdBlips.forEach((blip) => {
        if (native.doesBlipExist(blip)) {
            native.removeBlip(blip);
        }
    });
    clientState.createdBlips.length = 0;

    clientState.weaponShops.forEach((shop) => {
        const blip = native.addBlipForCoord(shop.x, shop.y, shop.z);
        native.setBlipSprite(blip, BLIP_SPRITES.WEAPON_SHOP);
        native.setBlipColour(blip, 1);
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(shop.name);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    clientState.clothingShops.forEach((shop) => {
        const blip = native.addBlipForCoord(shop.x, shop.y, shop.z);
        native.setBlipSprite(blip, BLIP_SPRITES.CLOTHING_SHOP);
        native.setBlipColour(blip, 3);
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(shop.name);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    clientState.casinos.forEach((casino) => {
        const blip = native.addBlipForCoord(casino.x, casino.y, casino.z);
        native.setBlipSprite(blip, BLIP_SPRITES.CASINO);
        native.setBlipColour(blip, 46);
        native.setBlipScale(blip, 1.0);
        native.setBlipAsShortRange(blip, false);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(casino.name);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    clientState.properties.forEach((prop) => {
        const blip = native.addBlipForCoord(prop.pos_x, prop.pos_y, prop.pos_z);
        if (prop.owner_player_id === null) {
            native.setBlipSprite(blip, BLIP_SPRITES.PROPERTY_FOR_SALE);
            native.setBlipColour(blip, 2);
        } else {
            native.setBlipSprite(blip, BLIP_SPRITES.PROPERTY_OWNED);
            native.setBlipColour(blip, 3);
        }
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        const label =
            prop.owner_player_id === null ? `${prop.name} - $${prop.price.toLocaleString()}` : `${prop.name} (Owned)`;
        native.addTextComponentSubstringPlayerName(label);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    HOSPITALS.forEach((hospital) => {
        const blip = native.addBlipForCoord(hospital.x, hospital.y, hospital.z);
        native.setBlipSprite(blip, BLIP_SPRITES.HOSPITAL);
        native.setBlipColour(blip, 49);
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(hospital.name);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    VEHICLE_DEALERSHIPS.forEach((dealership) => {
        const blip = native.addBlipForCoord(dealership.x, dealership.y, dealership.z);
        native.setBlipSprite(blip, BLIP_SPRITES.DEALERSHIP);
        native.setBlipColour(blip, 5);
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(dealership.name);
        native.endTextCommandSetBlipName(blip);
        clientState.createdBlips.push(blip);
    });

    alt.log(`[gta] Created ${clientState.createdBlips.length} map blips`);
}

alt.onServer('gta:locations:update', (data: { weaponShops: ShopLocation[]; clothingShops: ShopLocation[]; casinos: ShopLocation[] }) => {
    clientState.weaponShops = data.weaponShops;
    clientState.clothingShops = data.clothingShops;
    clientState.casinos = data.casinos;
    alt.log(
        `[gta] Loaded ${clientState.weaponShops.length} weapon shops, ${clientState.clothingShops.length} clothing shops, ${clientState.casinos.length} casinos`
    );
    createMapBlips();
});

alt.onServer('property:list', (props: PropertyLocation[]) => {
    clientState.properties = props;
    alt.log(`[gta] Loaded ${clientState.properties.length} properties`);
    createMapBlips();
});
