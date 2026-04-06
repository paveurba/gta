import type { ShopLocation } from './types.js';

export const SAFE_SPAWN = { x: 425.1, y: -979.5, z: 30.7 };

/** Must match server `SYNCED_DISPLAY_NAME` in `server/constants/syncedMetaKeys.ts`. */
export const NAMETAG_SYNCED_META = 'gta:displayName';
export const NAMETAG_MAX_DIST_SQ = 22 * 22;
export const NAMETAG_HEAD_OFFSET_Z = 0.95;

export const PROPERTY_INTERACTION_RADIUS = 5.0;
export const SHOP_INTERACTION_RADIUS = 5.0;
export const SHOP_PAGE_SIZE = 6;
export const VEHICLE_PAGE_SIZE = 8;
export const DEALERSHIP_INTERACTION_RADIUS = 10.0;

export const HOSPITALS: ShopLocation[] = [
    { x: 340.25, y: -580.59, z: 28.82, name: 'Pillbox Hill Medical Center' },
    { x: -449.67, y: -340.55, z: 34.51, name: 'Mount Zonah Medical Center' },
    { x: 1839.44, y: 3672.71, z: 34.28, name: 'Sandy Shores Medical Center' },
    { x: -247.46, y: 6331.23, z: 32.43, name: 'Paleto Bay Medical Center' },
];

export const BLIP_SPRITES = {
    WEAPON_SHOP: 110,
    CLOTHING_SHOP: 73,
    CASINO: 679,
    PROPERTY_FOR_SALE: 374,
    PROPERTY_OWNED: 40,
    HOSPITAL: 61,
    DEALERSHIP: 225,
} as const;

export const VEHICLE_DEALERSHIPS: ShopLocation[] = [
    { x: -56.49, y: -1097.25, z: 26.42, name: 'Premium Deluxe Motorsport' },
    { x: -31.66, y: -1106.95, z: 26.42, name: "Simeon's Dealership" },
];

export const CASINO_IPLS = [
    'vw_casino_main',
    'vw_casino_garage',
    'vw_dlc_casino_door',
    'vw_casino_penthouse',
    'hei_dlc_windows_intset',
];

export const PROPERTY_IPLS: { [key: string]: string[] } = {
    apa_v_mp_h_01_a: ['apa_v_mp_h_01_a'],
    apa_v_mp_h_02_a: ['apa_v_mp_h_02_a'],
    apa_v_mp_h_03_a: ['apa_v_mp_h_03_a'],
    apa_v_mp_h_04_a: ['apa_v_mp_h_04_a'],
    apa_v_mp_h_05_a: ['apa_v_mp_h_05_a'],
};

export const RESPAWN_DELAY = 5000;
export const RECONNECT_INTERVAL_MS = 3000;
export const MAX_CHAT_HISTORY = 10;
