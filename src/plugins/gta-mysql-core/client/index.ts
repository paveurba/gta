import * as alt from 'alt-client';
import * as native from 'natives';

const SAFE_SPAWN = { x: 425.1, y: -979.5, z: 30.7 };

alt.log('[gta-client] Plugin loaded');

// ============================================================================
// PLAYER STATE
// ============================================================================

let playerMoney = 0;
let playerBank = 0;
let isLoggedIn = false;
let currentPlayerId = 0;

// ============================================================================
// SHOP LOCATIONS
// ============================================================================

interface ShopLocation {
    x: number;
    y: number;
    z: number;
    name: string;
}

interface PropertyLocation {
    id: number;
    name: string;
    price: number;
    owner_player_id: number | null;
    pos_x: number;
    pos_y: number;
    pos_z: number;
    interior_x: number;
    interior_y: number;
    interior_z: number;
    interior_heading?: number;
    ipl?: string;
}

let weaponShops: ShopLocation[] = [];
let clothingShops: ShopLocation[] = [];
let casinos: ShopLocation[] = [];
let properties: PropertyLocation[] = [];
const createdBlips: number[] = [];

// Hospital locations for respawn (street level outside entrance)
const HOSPITALS: ShopLocation[] = [
    { x: 340.0, y: -569.0, z: 28.80, name: 'Pillbox Hill Medical Center' },
    { x: -449.0, y: -341.0, z: 34.50, name: 'Mount Zonah Medical Center' },
    { x: 1839.0, y: 3673.0, z: 34.00, name: 'Sandy Shores Medical Center' },
    { x: -247.0, y: 6331.0, z: 32.40, name: 'Paleto Bay Medical Center' },
];

// Blip sprite IDs for GTA V
const BLIP_SPRITES = {
    WEAPON_SHOP: 110,      // Gun icon
    CLOTHING_SHOP: 73,     // Shirt icon
    CASINO: 679,           // Casino chip icon
    PROPERTY_FOR_SALE: 374, // House for sale
    PROPERTY_OWNED: 40,    // House owned (safehouse)
    HOSPITAL: 61,          // Hospital cross icon
    DEALERSHIP: 225,       // Car dealership icon
};

// ============================================================================
// PROPERTY INTERACTION STATE
// ============================================================================

let nearbyProperty: PropertyLocation | null = null;
let propertyInteractionOpen = false;
let propertyMenuSelection = 0;
const PROPERTY_INTERACTION_RADIUS = 5.0;

// ============================================================================
// SHOP INTERACTION STATE
// ============================================================================

let nearbyShop: ShopLocation | null = null;
let nearbyShopType: 'weapon' | 'clothing' | 'casino' | null = null;
const SHOP_INTERACTION_RADIUS = 5.0;

let shopMenuOpen = false;
let shopMenuType: 'weapon' | 'clothing' | null = null;
let shopCatalog: any[] = [];
let shopMenuSelection = 0;
const SHOP_PAGE_SIZE = 6;

// ============================================================================
// VEHICLE DEALERSHIP STATE
// ============================================================================

interface VehicleCatalogItem {
    name: string;
    model: string;
    hash: number;
    price: number;
    category: string;
}

interface PlayerVehicle {
    id: number;
    model: string;
    model_hash: number;
    color_primary: number;
    color_secondary: number;
    garage_property_id: number | null;
    is_spawned: boolean;
}

let nearbyDealership: ShopLocation | null = null;
let dealershipMenuOpen = false;
let vehicleCatalog: VehicleCatalogItem[] = [];
let vehicleMenuSelection = 0;
const VEHICLE_PAGE_SIZE = 8;

const VEHICLE_DEALERSHIPS: ShopLocation[] = [
    { x: -56.49, y: -1097.25, z: 26.42, name: 'Premium Deluxe Motorsport' },
    { x: -31.66, y: -1106.95, z: 26.42, name: 'Simeon\'s Dealership' },
];
const DEALERSHIP_INTERACTION_RADIUS = 10.0;

// ============================================================================
// GARAGE STATE
// ============================================================================

let garageMenuOpen = false;
let garageVehicles: PlayerVehicle[] = [];
let garageMenuSelection = 0;
let currentGaragePropertyId: number | null = null;

function openShopMenu(type: 'weapon' | 'clothing'): void {
    shopMenuOpen = true;
    shopMenuType = type;
    shopMenuSelection = 0;
    shopCatalog = [];
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

function closeShopMenu(): void {
    shopMenuOpen = false;
    shopMenuType = null;
    shopCatalog = [];
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

function handleShopMenuKey(key: number): void {
    // Escape - Close menu
    if (key === 27) {
        closeShopMenu();
        return;
    }
    
    // Up arrow or W
    if (key === 38 || key === 87) {
        if (shopMenuSelection > 0) shopMenuSelection--;
        return;
    }
    
    // Down arrow or S
    if (key === 40 || key === 83) {
        if (shopMenuSelection < shopCatalog.length - 1) shopMenuSelection++;
        return;
    }
    
    // Enter or E - Buy selected item
    if (key === 13 || key === 69) {
        if (shopCatalog.length > 0 && shopMenuSelection < shopCatalog.length) {
            const item = shopCatalog[shopMenuSelection];
            if (shopMenuType === 'weapon') {
                alt.emitServer('weaponshop:buy', item.hash);
            } else if (shopMenuType === 'clothing') {
                alt.emitServer('clothingshop:buy', item.component, item.drawable, item.texture);
            }
        }
        return;
    }
}

// Server responses for shop catalogs
alt.onServer('weaponshop:catalog', (catalog: any[]) => {
    shopCatalog = catalog;
    alt.log(`[gta] Received weapon catalog: ${catalog.length} items`);
});

alt.onServer('clothingshop:catalog', (catalog: any[]) => {
    shopCatalog = catalog;
    alt.log(`[gta] Received clothing catalog: ${catalog.length} items`);
});

// ============================================================================
// VEHICLE DEALERSHIP FUNCTIONS
// ============================================================================

function findNearestDealership(): ShopLocation | null {
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

function openDealershipMenu(): void {
    dealershipMenuOpen = true;
    vehicleMenuSelection = 0;
    vehicleCatalog = [];
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('vehicle:getCatalog');
}

function closeDealershipMenu(): void {
    dealershipMenuOpen = false;
    vehicleCatalog = [];
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

function handleDealershipMenuKey(key: number): void {
    if (key === 27) { closeDealershipMenu(); return; }
    if (key === 38 || key === 87) { if (vehicleMenuSelection > 0) vehicleMenuSelection--; return; }
    if (key === 40 || key === 83) { if (vehicleMenuSelection < vehicleCatalog.length - 1) vehicleMenuSelection++; return; }
    if (key === 13 || key === 69) {
        if (vehicleCatalog.length > 0 && vehicleMenuSelection < vehicleCatalog.length) {
            const vehicle = vehicleCatalog[vehicleMenuSelection];
            alt.emitServer('vehicle:buy', vehicle.model, vehicle.hash, vehicle.price);
        }
        return;
    }
}

alt.onServer('vehicle:catalog', (catalog: VehicleCatalogItem[]) => {
    vehicleCatalog = catalog;
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

// ============================================================================
// GARAGE FUNCTIONS
// ============================================================================

function openGarageMenu(propertyId: number): void {
    garageMenuOpen = true;
    garageMenuSelection = 0;
    garageVehicles = [];
    currentGaragePropertyId = propertyId;
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('vehicle:getGarageVehicles', propertyId);
}

function closeGarageMenu(): void {
    garageMenuOpen = false;
    garageVehicles = [];
    currentGaragePropertyId = null;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

function handleGarageMenuKey(key: number): void {
    if (key === 27) { closeGarageMenu(); return; }
    if (key === 38 || key === 87) { if (garageMenuSelection > 0) garageMenuSelection--; return; }
    if (key === 40 || key === 83) { if (garageMenuSelection < garageVehicles.length) garageMenuSelection++; return; }
    if (key === 13 || key === 69) {
        if (garageMenuSelection === garageVehicles.length) {
            // "Store nearby vehicle" option
            if (currentGaragePropertyId) {
                alt.emitServer('vehicle:storeNearby', currentGaragePropertyId);
            }
        } else if (garageVehicles.length > 0 && garageMenuSelection < garageVehicles.length) {
            const vehicle = garageVehicles[garageMenuSelection];
            if (currentGaragePropertyId) {
                alt.emitServer('vehicle:spawnFromGarage', vehicle.id, currentGaragePropertyId);
            }
        }
        return;
    }
}

alt.onServer('vehicle:garageVehicles', (vehicles: PlayerVehicle[]) => {
    garageVehicles = vehicles;
    alt.log(`[gta] Received ${vehicles.length} garage vehicles`);
});

// ============================================================================
// MAP BLIP CREATION - Fixed coordinate system
// ============================================================================

function createMapBlips(): void {
    // Clear existing blips
    createdBlips.forEach(blip => {
        if (native.doesBlipExist(blip)) {
            native.removeBlip(blip);
        }
    });
    createdBlips.length = 0;

    // Weapon shops - Red gun icons
    weaponShops.forEach(shop => {
        const blip = native.addBlipForCoord(shop.x, shop.y, shop.z);
        native.setBlipSprite(blip, BLIP_SPRITES.WEAPON_SHOP);
        native.setBlipColour(blip, 1); // Red
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(shop.name);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    // Clothing shops - Blue shirt icons
    clothingShops.forEach(shop => {
        const blip = native.addBlipForCoord(shop.x, shop.y, shop.z);
        native.setBlipSprite(blip, BLIP_SPRITES.CLOTHING_SHOP);
        native.setBlipColour(blip, 3); // Blue
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(shop.name);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    // Casinos - Gold casino chip icons
    casinos.forEach(casino => {
        const blip = native.addBlipForCoord(casino.x, casino.y, casino.z);
        native.setBlipSprite(blip, BLIP_SPRITES.CASINO);
        native.setBlipColour(blip, 46); // Gold/Yellow
        native.setBlipScale(blip, 1.0);
        native.setBlipAsShortRange(blip, false); // Always visible
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(casino.name);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    // Properties - Green for sale, Blue for owned
    properties.forEach(prop => {
        const blip = native.addBlipForCoord(prop.pos_x, prop.pos_y, prop.pos_z);
        if (prop.owner_player_id === null) {
            native.setBlipSprite(blip, BLIP_SPRITES.PROPERTY_FOR_SALE);
            native.setBlipColour(blip, 2); // Green - for sale
        } else {
            native.setBlipSprite(blip, BLIP_SPRITES.PROPERTY_OWNED);
            native.setBlipColour(blip, 3); // Blue - owned
        }
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        const label = prop.owner_player_id === null 
            ? `${prop.name} - $${prop.price.toLocaleString()}` 
            : `${prop.name} (Owned)`;
        native.addTextComponentSubstringPlayerName(label);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    // Hospitals - Pink/Red cross icons
    HOSPITALS.forEach(hospital => {
        const blip = native.addBlipForCoord(hospital.x, hospital.y, hospital.z);
        native.setBlipSprite(blip, BLIP_SPRITES.HOSPITAL);
        native.setBlipColour(blip, 49); // Pink/Medical
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(hospital.name);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    // Vehicle dealerships - Car icons
    VEHICLE_DEALERSHIPS.forEach(dealership => {
        const blip = native.addBlipForCoord(dealership.x, dealership.y, dealership.z);
        native.setBlipSprite(blip, BLIP_SPRITES.DEALERSHIP);
        native.setBlipColour(blip, 5); // Yellow
        native.setBlipScale(blip, 0.9);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        native.addTextComponentSubstringPlayerName(dealership.name);
        native.endTextCommandSetBlipName(blip);
        createdBlips.push(blip);
    });

    alt.log(`[gta] Created ${createdBlips.length} map blips`);
}

alt.onServer('gta:locations:update', (data: { weaponShops: ShopLocation[]; clothingShops: ShopLocation[]; casinos: ShopLocation[] }) => {
    weaponShops = data.weaponShops;
    clothingShops = data.clothingShops;
    casinos = data.casinos;
    alt.log(`[gta] Loaded ${weaponShops.length} weapon shops, ${clothingShops.length} clothing shops, ${casinos.length} casinos`);
    createMapBlips();
});

alt.onServer('property:list', (props: PropertyLocation[]) => {
    properties = props;
    alt.log(`[gta] Loaded ${properties.length} properties`);
    createMapBlips();
});

alt.onServer('gta:playerId', (id: number) => {
    currentPlayerId = id;
});

alt.onServer('gta:logout', () => {
    isLoggedIn = false;
    currentPlayerId = 0;
    playerMoney = 0;
    playerBank = 0;
    properties = [];
    createMapBlips();
    addNotification('Logged out successfully');
});

// ============================================================================
// PROPERTY SYSTEM - Ground-level coordinate calculation
// ============================================================================

function getDistanceToProperty(prop: PropertyLocation): number {
    const player = alt.Player.local;
    if (!player || !player.valid) return Infinity;
    const pos = player.pos;

    // Use 2D XY distance — Z is unreliable (stored coords may differ from actual ground level)
    const dx = prop.pos_x - pos.x;
    const dy = prop.pos_y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function findNearestShop(): { shop: ShopLocation; type: 'weapon' | 'clothing' | 'casino' } | null {
    const player = alt.Player.local;
    if (!player || !player.valid) return null;
    const pos = player.pos;

    let nearest: { shop: ShopLocation; type: 'weapon' | 'clothing' | 'casino' } | null = null;
    let minDist = SHOP_INTERACTION_RADIUS;

    const checkList: { list: ShopLocation[]; type: 'weapon' | 'clothing' | 'casino' }[] = [
        { list: weaponShops, type: 'weapon' },
        { list: clothingShops, type: 'clothing' },
        { list: casinos, type: 'casino' },
    ];

    for (const { list, type } of checkList) {
        for (const shop of list) {
            // 2D XY distance — ignores Z so floating coords don't block interaction
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

function findNearestProperty(): PropertyLocation | null {
    if (properties.length === 0) return null;
    
    let nearest: PropertyLocation | null = null;
    let minDist = PROPERTY_INTERACTION_RADIUS;
    
    for (const prop of properties) {
        const dist = getDistanceToProperty(prop);
        if (dist < minDist) {
            minDist = dist;
            nearest = prop;
        }
    }
    
    return nearest;
}

function openPropertyMenu(): void {
    if (propertyInteractionOpen || !nearbyProperty) return;
    propertyInteractionOpen = true;
    propertyMenuSelection = 0;
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

function closePropertyMenu(): void {
    if (!propertyInteractionOpen) return;
    propertyInteractionOpen = false;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

function handlePropertyAction(action: 'buy' | 'enter' | 'exit' | 'sell'): void {
    if (!nearbyProperty) return;
    
    switch (action) {
        case 'buy':
            alt.emitServer('property:buy', nearbyProperty.id);
            break;
        case 'enter':
            alt.emitServer('property:enter', nearbyProperty.id);
            break;
        case 'exit':
            alt.emitServer('property:exit', nearbyProperty.id);
            break;
        case 'sell':
            alt.emitServer('property:sell', nearbyProperty.id);
            break;
    }
    closePropertyMenu();
}

// Server responses for property actions
alt.onServer('property:buyResult', (result: { success: boolean; message: string; newBalance?: number; property?: PropertyLocation }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
        if (result.newBalance !== undefined) {
            playerMoney = result.newBalance;
        }
        // Request updated property list
        alt.emitServer('property:requestList');
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('property:sellResult', (result: { success: boolean; message: string; newBalance?: number }) => {
    if (result.success) {
        addNotification(`SUCCESS: ${result.message}`);
        if (result.newBalance !== undefined) {
            playerMoney = result.newBalance;
        }
        alt.emitServer('property:requestList');
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('property:enterResult', (result: { success: boolean; message: string; interior?: { x: number; y: number; z: number; heading: number; ipl?: string } }) => {
    if (result.success && result.interior) {
        // Load IPL if needed
        if (result.interior.ipl) {
            loadPropertyIPL(result.interior.ipl);
        }
        // Teleport to interior
        const player = alt.Player.local;
        if (player && player.valid) {
            native.setEntityCoordsNoOffset(
                player.scriptID, 
                result.interior.x, 
                result.interior.y, 
                result.interior.z, 
                false, false, false
            );
            native.setEntityHeading(player.scriptID, result.interior.heading);
        }
        addNotification(result.message);
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

alt.onServer('property:exitResult', (result: { success: boolean; message: string; exterior?: { x: number; y: number; z: number } }) => {
    if (result.success && result.exterior) {
        const player = alt.Player.local;
        if (player && player.valid) {
            native.setEntityCoordsNoOffset(
                player.scriptID, 
                result.exterior.x, 
                result.exterior.y, 
                result.exterior.z + 1.0, 
                false, false, false
            );
        }
        addNotification(result.message);
    } else {
        addNotification(`FAILED: ${result.message}`);
    }
});

// ============================================================================
// PROPERTY IPL LOADING
// ============================================================================

const PROPERTY_IPLS: { [key: string]: string[] } = {
    'apa_v_mp_h_01_a': ['apa_v_mp_h_01_a'],
    'apa_v_mp_h_02_a': ['apa_v_mp_h_02_a'],
    'apa_v_mp_h_03_a': ['apa_v_mp_h_03_a'],
    'apa_v_mp_h_04_a': ['apa_v_mp_h_04_a'],
    'apa_v_mp_h_05_a': ['apa_v_mp_h_05_a'],
};

function loadPropertyIPL(iplName: string): void {
    const ipls = PROPERTY_IPLS[iplName] || [iplName];
    ipls.forEach(ipl => {
        if (!native.isIplActive(ipl)) {
            native.requestIpl(ipl);
            alt.log(`[gta] Loaded property IPL: ${ipl}`);
        }
    });
}

// ============================================================================
// PHONE SYSTEM
// ============================================================================

let phoneOpen = false;
let phoneTab: 'main' | 'contacts' | 'messages' | 'addContact' | 'sendMessage' = 'main';
let phoneContacts: Array<{ id: number; contact_name: string; contact_number: string }> = [];
let phoneMessages: Array<{ id: number; sender_id: number; receiver_id: number; message: string; is_read: boolean }> = [];
let phoneUnread = 0;
let phoneInput = '';
let phoneInput2 = '';
let phoneSelectedContact = 0;

function openPhone(): void {
    if (phoneOpen || propertyInteractionOpen) return;
    phoneOpen = true;
    phoneTab = 'main';
    phoneInput = '';
    phoneInput2 = '';
    alt.showCursor(true);
    alt.toggleGameControls(false);
    alt.emitServer('phone:getData');
}

function closePhone(): void {
    if (!phoneOpen) return;
    phoneOpen = false;
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

alt.onServer('phone:data', (data: { contacts: any[]; messages: any[]; unreadCount: number }) => {
    phoneContacts = data.contacts;
    phoneMessages = data.messages;
    phoneUnread = data.unreadCount;
});

alt.onServer('phone:newMessage', (msg: any) => {
    phoneMessages.unshift(msg);
    phoneUnread++;
    addNotification(`New message from ${msg.sender_id}`);
});

// ============================================================================
// DEATH SCREEN
// ============================================================================

let isDead = false;
let deathTime = 0;
const RESPAWN_DELAY = 5000;

alt.on('playerDeath', () => {
    isDead = true;
    deathTime = Date.now();
    alt.log('[gta-client] Player died');
});

alt.onServer('gta:spawn:safe', () => {
    isDead = false;
});

// ============================================================================
// CASINO RESULTS
// ============================================================================

let slotsResult: { symbols: string[]; won: boolean; winAmount: number } | null = null;
let rouletteResult: { number: number; color: string; won: boolean; winAmount: number } | null = null;
let showCasinoResult = 0;

alt.onServer('casino:slotsResult', (result: any) => {
    slotsResult = result;
    showCasinoResult = Date.now() + 5000;
});

alt.onServer('casino:rouletteResult', (result: any) => {
    rouletteResult = result;
    showCasinoResult = Date.now() + 5000;
});

// ============================================================================
// CHAT SYSTEM
// ============================================================================

let chatOpen = false;
let chatInput = '';
let chatHistory: string[] = [];
const MAX_CHAT_HISTORY = 10;

function openChat(): void {
    if (chatOpen || phoneOpen || propertyInteractionOpen) return;
    chatOpen = true;
    chatInput = '';
    alt.showCursor(true);
    alt.toggleGameControls(false);
}

function closeChat(): void {
    if (!chatOpen) return;
    chatOpen = false;
    chatInput = '';
    alt.showCursor(false);
    alt.toggleGameControls(true);
}

function sendChat(): void {
    if (chatInput.trim().length === 0) {
        closeChat();
        return;
    }
    const msg = chatInput.trim();
    chatHistory.unshift(msg);
    if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.pop();
    alt.emitServer('gta:chat:send', msg);
    closeChat();
}

function addNotification(msg: string): void {
    chatHistory.unshift(`> ${msg}`);
    if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.pop();
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

alt.onServer('gta:notify', (message: string) => {
    native.beginTextCommandThefeedPost('STRING');
    native.addTextComponentSubstringPlayerName(message);
    native.endTextCommandThefeedPostTicker(false, false);
    addNotification(message);
});

// ============================================================================
// MONEY SYNC
// ============================================================================

alt.onServer('gta:money:update', (money: number, bank: number) => {
    playerMoney = money;
    playerBank = bank;
    if (!isLoggedIn) {
        isLoggedIn = true;
        // Request property list on first login
        alt.emitServer('property:requestList');
    }
});

// ============================================================================
// SAFE SPAWN
// ============================================================================

async function forceSafeGroundSpawn(x: number, y: number, z: number): Promise<void> {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    
    // Load collision at target location
    native.requestCollisionAtCoord(x, y, z);
    await new Promise(resolve => alt.setTimeout(resolve, 100));
    
    // Try to find ground Z, but use provided Z as fallback
    let groundZ = z;
    const [found, result] = native.getGroundZFor3dCoord(x, y, z + 100, 0, false, false);
    if (found && result > 0) {
        groundZ = result;
    }
    
    // Teleport player to ground level
    native.setEntityCoordsNoOffset(player.scriptID, x, y, groundZ + 1.0, false, false, false);
}

alt.onServer('gta:spawn:safe', (x: number, y: number, z: number) => {
    forceSafeGroundSpawn(x, y, z).catch(() => {});
});

// ============================================================================
// CASINO IPL LOADING
// ============================================================================

const CASINO_IPLS = [
    'vw_casino_main',
    'vw_casino_garage',
    'vw_dlc_casino_door',
    'vw_casino_penthouse',
    'hei_dlc_windows_intset',
];

function loadCasinoInterior(): void {
    CASINO_IPLS.forEach(ipl => {
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

// ============================================================================
// DISABLE ALL AI POPULATION (GTA Online style - no NPCs)
// ============================================================================

function disableAmbientPopulation(): void {
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

// ============================================================================
// CONNECTION
// ============================================================================

alt.on('connectionComplete', () => {
    alt.log('[gta-client] Connection complete');
    alt.loadDefaultIpls();
    loadCasinoInterior();
    disablePopulationOnce();
    native.requestCollisionAtCoord(924.0, 46.0, 81.1);
});

// ============================================================================
// KEY HANDLING
// ============================================================================

let justOpened = false;
let shiftPressed = false;
let activeInput: 'chat' | 'phone1' | 'phone2' = 'chat';

alt.on('keydown', (key) => {
    const keyNum = key as number;
    if (keyNum === 16 || keyNum === 160 || keyNum === 161) shiftPressed = true;
});

alt.on('keyup', (key) => {
    const keyNum = key as number;
    if (keyNum === 16 || keyNum === 160 || keyNum === 161) { shiftPressed = false; return; }

    // E key (69) - Dealership interaction (highest priority)
    if (key === 69 && !chatOpen && !phoneOpen && !propertyInteractionOpen && !shopMenuOpen && !dealershipMenuOpen && !garageMenuOpen && nearbyDealership) {
        openDealershipMenu();
        return;
    }
    
    // Dealership menu navigation
    if (dealershipMenuOpen) {
        handleDealershipMenuKey(key);
        return;
    }
    
    // Garage menu navigation
    if (garageMenuOpen) {
        handleGarageMenuKey(key);
        return;
    }

    // E key (69) - Shop interaction (checked before property — shops take priority when inside cylinder)
    if (key === 69 && !chatOpen && !phoneOpen && !propertyInteractionOpen && !shopMenuOpen && !dealershipMenuOpen && !garageMenuOpen && nearbyShop && nearbyShopType) {
        if (nearbyShopType === 'weapon') {
            openShopMenu('weapon');
            alt.emitServer('weaponshop:getCatalog');
        } else if (nearbyShopType === 'clothing') {
            openShopMenu('clothing');
            alt.emitServer('clothingshop:getCatalog');
        } else if (nearbyShopType === 'casino') {
            addNotification('Casino: Use /slots <bet> or /roulette <bet> <type> <value>');
        }
        return;
    }
    
    // Shop menu navigation
    if (shopMenuOpen) {
        handleShopMenuKey(key);
        return;
    }

    // E key (69) - Property interaction
    if (key === 69 && !chatOpen && !phoneOpen && !propertyInteractionOpen && !shopMenuOpen && !dealershipMenuOpen && !garageMenuOpen && nearbyProperty) {
        openPropertyMenu();
        return;
    }

    // Property menu navigation
    if (propertyInteractionOpen) {
        handlePropertyMenuKey(key);
        return;
    }

    // M key (77) - Toggle phone
    if (key === 77 && !chatOpen && !propertyInteractionOpen) {
        if (phoneOpen) closePhone();
        else if (isLoggedIn) openPhone();
        return;
    }

    // T key (84) - Open chat
    if (key === 84 && !chatOpen && !phoneOpen && !propertyInteractionOpen) {
        openChat();
        justOpened = true;
        activeInput = 'chat';
        alt.setTimeout(() => { justOpened = false; }, 100);
        return;
    }

    if (justOpened) return;

    // Phone navigation
    if (phoneOpen) {
        handlePhoneKey(key);
        return;
    }

    // Chat input
    if (chatOpen) {
        handleTextInput(key, 'chat');
        return;
    }
});

function handlePropertyMenuKey(key: number): void {
    if (!nearbyProperty) return;

    // Escape - Close menu
    if (key === 27) {
        closePropertyMenu();
        return;
    }

    const isOwned = nearbyProperty.owner_player_id === currentPlayerId;
    const isForSale = nearbyProperty.owner_player_id === null;

    // Number keys for actions
    if (key === 49) { // 1 - Buy (if for sale)
        if (isForSale) handlePropertyAction('buy');
        return;
    }
    if (key === 50) { // 2 - Enter (if owned)
        if (isOwned) handlePropertyAction('enter');
        return;
    }
    if (key === 51) { // 3 - Sell (if owned)
        if (isOwned) handlePropertyAction('sell');
        return;
    }
    if (key === 52) { // 4 - Garage (if owned)
        if (isOwned) {
            closePropertyMenu();
            openGarageMenu(nearbyProperty.id);
        }
        return;
    }
}

function handlePhoneKey(key: number): void {
    if (key === 27) {
        if (phoneTab === 'main') closePhone();
        else phoneTab = 'main';
        return;
    }

    if (phoneTab === 'main') {
        if (key === 49) { phoneTab = 'contacts'; return; }
        if (key === 50) { phoneTab = 'messages'; return; }
        if (key === 51) { phoneTab = 'addContact'; phoneInput = ''; phoneInput2 = ''; activeInput = 'phone1'; return; }
        if (key === 52) { phoneTab = 'sendMessage'; phoneInput = ''; phoneInput2 = ''; activeInput = 'phone1'; return; }
    }

    if (key === 9 && (phoneTab === 'addContact' || phoneTab === 'sendMessage')) {
        activeInput = activeInput === 'phone1' ? 'phone2' : 'phone1';
        return;
    }

    if (key === 13) {
        if (phoneTab === 'addContact' && phoneInput && phoneInput2) {
            alt.emitServer('phone:addContact', phoneInput, phoneInput2);
            phoneTab = 'main';
        } else if (phoneTab === 'sendMessage' && phoneInput && phoneInput2) {
            const receiverId = parseInt(phoneInput);
            if (receiverId) {
                alt.emitServer('phone:sendMessage', receiverId, phoneInput2);
                phoneTab = 'main';
            }
        }
        return;
    }

    if (phoneTab === 'addContact' || phoneTab === 'sendMessage') {
        handleTextInput(key, activeInput);
    }
}

function handleTextInput(key: number, target: 'chat' | 'phone1' | 'phone2'): void {
    let input = target === 'chat' ? chatInput : target === 'phone1' ? phoneInput : phoneInput2;

    if (key === 13 && target === 'chat') { sendChat(); return; }
    if (key === 27 && target === 'chat') { closeChat(); return; }
    if (key === 8) { input = input.slice(0, -1); }
    else if (key >= 65 && key <= 90) {
        const char = String.fromCharCode(key);
        input += shiftPressed ? char : char.toLowerCase();
    }
    else if (key >= 48 && key <= 57) {
        if (shiftPressed) {
            const shiftNumbers: { [k: number]: string } = { 48: ')', 49: '!', 50: '@', 51: '#', 52: '$', 53: '%', 54: '^', 55: '&', 56: '*', 57: '(' };
            input += shiftNumbers[key] || '';
        } else {
            input += String.fromCharCode(key);
        }
    }
    else if (key === 32) { input += ' '; }
    else {
        const specialKeys: { [k: number]: [string, string] } = {
            190: ['.', '>'], 188: [',', '<'], 191: ['/', '?'], 189: ['-', '_'],
            187: ['=', '+'], 192: ['`', '~'], 219: ['[', '{'], 221: [']', '}'],
            220: ['\\', '|'], 186: [';', ':'], 222: ["'", '"']
        };
        if (specialKeys[key]) input += shiftPressed ? specialKeys[key][1] : specialKeys[key][0];
    }

    if (target === 'chat') chatInput = input;
    else if (target === 'phone1') phoneInput = input;
    else phoneInput2 = input;
}

// ============================================================================
// DRAWING UTILITIES
// ============================================================================

function drawText(text: string, x: number, y: number, scale: number, r: number, g: number, b: number, center = false): void {
    native.setTextFont(4);
    native.setTextScale(scale, scale);
    native.setTextColour(r, g, b, 255);
    native.setTextOutline();
    if (center) native.setTextCentre(true);
    else { native.setTextRightJustify(true); native.setTextWrap(0, x); }
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(text);
    native.endTextCommandDisplayText(x, y, 0);
}

function drawTextLeft(text: string, x: number, y: number, scale: number, r: number, g: number, b: number): void {
    native.setTextFont(4);
    native.setTextScale(scale, scale);
    native.setTextColour(r, g, b, 255);
    native.setTextOutline();
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName(text);
    native.endTextCommandDisplayText(x, y, 0);
}

function drawRect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    native.drawRect(x, y, w, h, r, g, b, a, false);
}

// ============================================================================
// PROPERTY MARKERS - Fixed ground-level rendering
// ============================================================================

function drawPropertyMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    // Update nearby property detection
    nearbyProperty = findNearestProperty();

    properties.forEach(prop => {
        const dist = getDistanceToProperty(prop);
        
        // Draw 3D marker for properties within 50m
        if (dist < 50) {
            const isForSale = prop.owner_player_id === null;
            const isOwned = prop.owner_player_id === currentPlayerId;
            
            // Color: Green for sale, Blue for owned by player, Gray for owned by others
            let color: [number, number, number];
            if (isForSale) {
                color = [100, 255, 100]; // Green
            } else if (isOwned) {
                color = [100, 100, 255]; // Blue
            } else {
                color = [150, 150, 150]; // Gray
            }

            // Draw checkered flat marker on ground (type 27)
            native.drawMarker(
                27, // Checkered flat marker - sits ON the ground
                prop.pos_x, prop.pos_y, prop.pos_z + 0.01, // Slightly above ground to be visible
                0, 0, 0,
                0, 0, 0,
                1.5, 1.5, 1.0,
                color[0], color[1], color[2], 200,
                false, false, 2, false, null as any, null as any, false
            );

            // Draw arrow pointing down above the marker (type 5)
            native.drawMarker(
                5, // Arrow pointing down
                prop.pos_x, prop.pos_y, prop.pos_z + 2.5,
                0, 0, 0,
                0, 180.0, 0, // Rotate to point down
                0.6, 0.6, 0.6,
                color[0], color[1], color[2], 200,
                true, true, 2, true, null as any, null as any, false
            );

            // Draw property info when close
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

            // Draw interaction prompt when very close
            if (dist < PROPERTY_INTERACTION_RADIUS && !propertyInteractionOpen) {
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

// ============================================================================
// SHOP MARKERS
// ============================================================================

function drawShopMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    // Update nearby shop state (2D XY distance — Z ignored so elevated coords don't block entry)
    const nearestResult = findNearestShop();
    nearbyShop = nearestResult ? nearestResult.shop : null;
    nearbyShopType = nearestResult ? nearestResult.type : null;

    [...weaponShops, ...clothingShops, ...casinos].forEach((shop) => {
        // Use 2D XY distance for render culling too
        const dx = shop.x - pos.x;
        const dy = shop.y - pos.y;
        const dist2d = Math.sqrt(dx * dx + dy * dy);

        if (dist2d < 50) {
            const isWeapon = weaponShops.includes(shop);
            const isClothing = clothingShops.includes(shop);
            const color = isWeapon ? [255, 100, 100] : isClothing ? [100, 100, 255] : [255, 215, 0];

            // Cylinder base at player foot level: pos_z anchors at ground, cylinder goes up 2 units
            native.drawMarker(
                1, // Cylinder
                shop.x, shop.y, shop.z - 1.0,
                0, 0, 0,
                0, 0, 0,
                0.8, 0.8, 2.0,
                color[0], color[1], color[2], 100,
                false, false, 2, false, null as any, null as any, false
            );

            // Draw shop name when close
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

            // Show "Press E" prompt when inside interaction radius
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

// ============================================================================
// DEALERSHIP MARKERS
// ============================================================================

function drawDealershipMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    // Update nearby dealership state
    nearbyDealership = findNearestDealership();

    VEHICLE_DEALERSHIPS.forEach((dealership) => {
        const dx = dealership.x - pos.x;
        const dy = dealership.y - pos.y;
        const dist2d = Math.sqrt(dx * dx + dy * dy);

        if (dist2d < 50) {
            // Yellow cylinder marker for dealership
            native.drawMarker(
                1, // Cylinder
                dealership.x, dealership.y, dealership.z - 1.0,
                0, 0, 0,
                0, 0, 0,
                1.5, 1.5, 2.0,
                255, 200, 100, 100,
                false, false, 2, false, null as any, null as any, false
            );

            // Draw dealership name when close
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

            // Show "Press E" prompt when inside interaction radius
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

// ============================================================================
// PROPERTY MENU UI
// ============================================================================

function drawPropertyMenu(): void {
    if (!propertyInteractionOpen || !nearbyProperty) return;

    const prop = nearbyProperty;
    const isForSale = prop.owner_player_id === null;
    const isOwned = prop.owner_player_id === currentPlayerId;

    // Background
    drawRect(0.5, 0.5, 0.3, 0.35, 20, 20, 30, 230);
    
    // Title
    drawTextLeft(prop.name, 0.38, 0.36, 0.5, 255, 200, 100);
    
    // Price info
    if (isForSale) {
        drawTextLeft(`Price: $${prop.price.toLocaleString()}`, 0.38, 0.42, 0.4, 100, 255, 100);
        drawTextLeft(`Your money: $${playerMoney.toLocaleString()}`, 0.38, 0.46, 0.35, 200, 200, 200);
    } else if (isOwned) {
        drawTextLeft('You own this property', 0.38, 0.42, 0.4, 100, 100, 255);
        drawTextLeft(`Sell value: $${Math.floor(prop.price * 0.7).toLocaleString()}`, 0.38, 0.46, 0.35, 200, 200, 200);
    } else {
        drawTextLeft('This property is owned', 0.38, 0.42, 0.4, 255, 100, 100);
    }

    // Options
    let yPos = 0.52;
    if (isForSale) {
        const canAfford = playerMoney >= prop.price;
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

    // Close hint
    drawTextLeft('[ESC] Close', 0.38, 0.65, 0.35, 150, 150, 150);
}

// ============================================================================
// DEALERSHIP MENU UI
// ============================================================================

function drawDealershipMenu(): void {
    if (!dealershipMenuOpen) return;
    
    // Background
    drawRect(0.5, 0.5, 0.4, 0.55, 20, 20, 30, 230);
    
    // Title
    drawTextLeft('VEHICLE DEALERSHIP', 0.33, 0.27, 0.6, 255, 200, 100);
    drawTextLeft(`Your money: $${playerMoney.toLocaleString()}`, 0.33, 0.32, 0.35, 200, 200, 200);
    
    if (vehicleCatalog.length === 0) {
        drawTextLeft('Loading vehicles...', 0.33, 0.4, 0.4, 200, 200, 200);
    } else {
        const startIdx = Math.floor(vehicleMenuSelection / VEHICLE_PAGE_SIZE) * VEHICLE_PAGE_SIZE;
        const endIdx = Math.min(startIdx + VEHICLE_PAGE_SIZE, vehicleCatalog.length);
        
        let yPos = 0.37;
        for (let i = startIdx; i < endIdx; i++) {
            const vehicle = vehicleCatalog[i];
            const isSelected = i === vehicleMenuSelection;
            const canAfford = playerMoney >= vehicle.price;
            const color = isSelected ? [255, 255, 100] : canAfford ? [200, 200, 200] : [100, 100, 100];
            
            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.38, 0.035, 60, 60, 80, 200);
            }
            
            const priceStr = `$${vehicle.price.toLocaleString()}`;
            drawTextLeft(`${vehicle.name} (${vehicle.category})`, 0.33, yPos, 0.35, color[0], color[1], color[2]);
            drawTextLeft(priceStr, 0.62, yPos, 0.35, color[0], color[1], color[2]);
            yPos += 0.04;
        }
        
        const totalPages = Math.ceil(vehicleCatalog.length / VEHICLE_PAGE_SIZE);
        const currentPage = Math.floor(vehicleMenuSelection / VEHICLE_PAGE_SIZE) + 1;
        drawTextLeft(`Page ${currentPage}/${totalPages}`, 0.33, 0.7, 0.3, 150, 150, 150);
    }
    
    drawTextLeft('[W/S] Navigate  [E/Enter] Buy  [ESC] Close', 0.33, 0.74, 0.3, 150, 150, 150);
}

// ============================================================================
// GARAGE MENU UI
// ============================================================================

function drawGarageMenu(): void {
    if (!garageMenuOpen) return;
    
    // Background
    drawRect(0.5, 0.5, 0.35, 0.45, 20, 20, 30, 230);
    
    // Title
    drawTextLeft('GARAGE', 0.36, 0.32, 0.6, 255, 200, 100);
    
    if (garageVehicles.length === 0) {
        drawTextLeft('No vehicles in garage', 0.36, 0.42, 0.4, 200, 200, 200);
    } else {
        let yPos = 0.4;
        for (let i = 0; i < garageVehicles.length; i++) {
            const vehicle = garageVehicles[i];
            const isSelected = i === garageMenuSelection;
            const color = isSelected ? [255, 255, 100] : [200, 200, 200];
            
            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.33, 0.035, 60, 60, 80, 200);
            }
            
            drawTextLeft(`${vehicle.model}`, 0.36, yPos, 0.4, color[0], color[1], color[2]);
            yPos += 0.04;
        }
    }
    
    // Store nearby vehicle option
    const storeSelected = garageMenuSelection === garageVehicles.length;
    const storeColor = storeSelected ? [255, 255, 100] : [100, 200, 100];
    if (storeSelected) {
        drawRect(0.5, 0.6 + 0.015, 0.33, 0.035, 60, 60, 80, 200);
    }
    drawTextLeft('[+] Store nearby vehicle', 0.36, 0.6, 0.4, storeColor[0], storeColor[1], storeColor[2]);
    
    drawTextLeft('[W/S] Navigate  [E/Enter] Spawn/Store  [ESC] Close', 0.36, 0.7, 0.28, 150, 150, 150);
}

// ============================================================================
// SHOP MENU UI
// ============================================================================

function drawShopMenu(): void {
    if (!shopMenuOpen) return;
    
    const title = shopMenuType === 'weapon' ? 'AMMU-NATION' : 'CLOTHING STORE';
    const titleColor = shopMenuType === 'weapon' ? [255, 100, 100] : [100, 100, 255];
    
    // Background
    drawRect(0.5, 0.5, 0.35, 0.5, 20, 20, 30, 230);
    
    // Title
    drawTextLeft(title, 0.36, 0.3, 0.6, titleColor[0], titleColor[1], titleColor[2]);
    
    if (shopCatalog.length === 0) {
        drawTextLeft('Loading...', 0.36, 0.4, 0.4, 200, 200, 200);
    } else {
        // Calculate page
        const startIdx = Math.floor(shopMenuSelection / SHOP_PAGE_SIZE) * SHOP_PAGE_SIZE;
        const endIdx = Math.min(startIdx + SHOP_PAGE_SIZE, shopCatalog.length);
        
        let yPos = 0.38;
        for (let i = startIdx; i < endIdx; i++) {
            const item = shopCatalog[i];
            const isSelected = i === shopMenuSelection;
            const color = isSelected ? [255, 255, 100] : [200, 200, 200];
            
            let itemText = '';
            if (shopMenuType === 'weapon') {
                itemText = `${item.name} - $${item.price.toLocaleString()}`;
            } else {
                itemText = `${item.name} - $${item.price.toLocaleString()}`;
            }
            
            if (isSelected) {
                drawRect(0.5, yPos + 0.015, 0.33, 0.035, 60, 60, 80, 200);
            }
            
            drawTextLeft(itemText, 0.36, yPos, 0.35, color[0], color[1], color[2]);
            yPos += 0.04;
        }
        
        // Page indicator
        const totalPages = Math.ceil(shopCatalog.length / SHOP_PAGE_SIZE);
        const currentPage = Math.floor(shopMenuSelection / SHOP_PAGE_SIZE) + 1;
        drawTextLeft(`Page ${currentPage}/${totalPages}`, 0.36, 0.65, 0.3, 150, 150, 150);
    }
    
    // Controls hint
    drawTextLeft('[W/S] Navigate  [E/Enter] Buy  [ESC] Close', 0.36, 0.7, 0.3, 150, 150, 150);
}

// ============================================================================
// DEATH SCREEN UI
// ============================================================================

function drawDeathScreen(): void {
    if (!isDead) return;
    
    const elapsed = Date.now() - deathTime;
    const remaining = Math.max(0, RESPAWN_DELAY - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    
    // Dark overlay
    drawRect(0.5, 0.5, 1.0, 1.0, 0, 0, 0, 180);
    
    // Death message
    native.setTextFont(4);
    native.setTextScale(1.0, 1.0);
    native.setTextColour(255, 50, 50, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName('WASTED');
    native.endTextCommandDisplayText(0.5, 0.4, 0);
    
    // Respawn countdown
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
    
    // Hospital fee notice
    native.setTextFont(4);
    native.setTextScale(0.35, 0.35);
    native.setTextColour(200, 200, 200, 255);
    native.setTextOutline();
    native.setTextCentre(true);
    native.beginTextCommandDisplayText('STRING');
    native.addTextComponentSubstringPlayerName('Hospital fee: $500');
    native.endTextCommandDisplayText(0.5, 0.55, 0);
}

// ============================================================================
// HUD DRAWING
// ============================================================================

alt.everyTick(() => {
    disableAmbientPopulation();
    
    // Death screen takes priority
    if (isDead) {
        drawDeathScreen();
        return;
    }
    
    // Money HUD (top right)
    if (isLoggedIn) {
        drawText(`$${playerMoney.toLocaleString()}`, 0.98, 0.02, 0.5, 114, 204, 114);
        drawText(`Bank: $${playerBank.toLocaleString()}`, 0.98, 0.055, 0.35, 200, 200, 200);
    } else {
        drawText('Press T - /register or /login', 0.98, 0.02, 0.35, 255, 255, 255);
    }

    // Property markers (with fixed ground-level coordinates)
    drawPropertyMarkers();

    // Shop markers
    drawShopMarkers();

    // Property menu
    drawPropertyMenu();
    
    // Shop menu
    drawShopMenu();
    
    // Dealership menu
    drawDealershipMenu();
    
    // Garage menu
    drawGarageMenu();
    
    // Dealership markers and detection
    drawDealershipMarkers();

    // Casino result display
    if (showCasinoResult > Date.now()) {
        drawRect(0.5, 0.3, 0.3, 0.15, 0, 0, 0, 200);
        if (slotsResult) {
            drawTextLeft(`[ ${slotsResult.symbols.join(' | ')} ]`, 0.38, 0.26, 0.6, 255, 215, 0);
            const resultColor = slotsResult.won ? [100, 255, 100] : [255, 100, 100];
            drawTextLeft(slotsResult.won ? `WIN: $${slotsResult.winAmount}` : 'No win', 0.42, 0.32, 0.5, resultColor[0], resultColor[1], resultColor[2]);
        }
        if (rouletteResult) {
            const colorMap: { [k: string]: number[] } = { red: [255, 50, 50], black: [50, 50, 50], green: [50, 255, 50] };
            const col = colorMap[rouletteResult.color] || [255, 255, 255];
            drawTextLeft(`${rouletteResult.number} (${rouletteResult.color})`, 0.42, 0.26, 0.6, col[0], col[1], col[2]);
            const resultColor = rouletteResult.won ? [100, 255, 100] : [255, 100, 100];
            drawTextLeft(rouletteResult.won ? `WIN: $${rouletteResult.winAmount}` : 'No win', 0.42, 0.32, 0.5, resultColor[0], resultColor[1], resultColor[2]);
        }
    }

    // Phone UI
    if (phoneOpen) {
        drawRect(0.5, 0.5, 0.25, 0.5, 30, 30, 40, 240);
        drawTextLeft('PHONE', 0.4, 0.28, 0.5, 100, 200, 255);
        
        if (phoneTab === 'main') {
            drawTextLeft('[1] Contacts', 0.4, 0.35, 0.4, 255, 255, 255);
            drawTextLeft('[2] Messages' + (phoneUnread > 0 ? ` (${phoneUnread})` : ''), 0.4, 0.40, 0.4, 255, 255, 255);
            drawTextLeft('[3] Add Contact', 0.4, 0.45, 0.4, 255, 255, 255);
            drawTextLeft('[4] Send Message', 0.4, 0.50, 0.4, 255, 255, 255);
            drawTextLeft('[ESC] Close', 0.4, 0.60, 0.35, 150, 150, 150);
        } else if (phoneTab === 'contacts') {
            drawTextLeft('CONTACTS', 0.4, 0.35, 0.4, 100, 200, 255);
            phoneContacts.slice(0, 5).forEach((c, i) => {
                drawTextLeft(`${c.contact_name}: ${c.contact_number}`, 0.4, 0.40 + i * 0.04, 0.35, 255, 255, 255);
            });
            if (phoneContacts.length === 0) drawTextLeft('No contacts', 0.4, 0.40, 0.35, 150, 150, 150);
            drawTextLeft('[ESC] Back', 0.4, 0.60, 0.35, 150, 150, 150);
        } else if (phoneTab === 'messages') {
            drawTextLeft('MESSAGES', 0.4, 0.35, 0.4, 100, 200, 255);
            phoneMessages.slice(0, 4).forEach((m, i) => {
                const preview = m.message.length > 20 ? m.message.slice(0, 20) + '...' : m.message;
                drawTextLeft(`From ${m.sender_id}: ${preview}`, 0.4, 0.40 + i * 0.04, 0.3, m.is_read ? 150 : 255, m.is_read ? 150 : 255, m.is_read ? 150 : 255);
            });
            if (phoneMessages.length === 0) drawTextLeft('No messages', 0.4, 0.40, 0.35, 150, 150, 150);
            drawTextLeft('[ESC] Back', 0.4, 0.60, 0.35, 150, 150, 150);
        } else if (phoneTab === 'addContact') {
            drawTextLeft('ADD CONTACT', 0.4, 0.35, 0.4, 100, 200, 255);
            drawTextLeft('Name:', 0.4, 0.42, 0.35, 200, 200, 200);
            drawRect(0.5, 0.465, 0.2, 0.03, activeInput === 'phone1' ? 60 : 40, activeInput === 'phone1' ? 60 : 40, activeInput === 'phone1' ? 80 : 50, 255);
            drawTextLeft(phoneInput + (activeInput === 'phone1' ? '_' : ''), 0.41, 0.455, 0.35, 255, 255, 255);
            drawTextLeft('Number:', 0.4, 0.50, 0.35, 200, 200, 200);
            drawRect(0.5, 0.525, 0.2, 0.03, activeInput === 'phone2' ? 60 : 40, activeInput === 'phone2' ? 60 : 40, activeInput === 'phone2' ? 80 : 50, 255);
            drawTextLeft(phoneInput2 + (activeInput === 'phone2' ? '_' : ''), 0.41, 0.515, 0.35, 255, 255, 255);
            drawTextLeft('[TAB] Switch | [ENTER] Save | [ESC] Back', 0.4, 0.60, 0.3, 150, 150, 150);
        } else if (phoneTab === 'sendMessage') {
            drawTextLeft('SEND MESSAGE', 0.4, 0.35, 0.4, 100, 200, 255);
            drawTextLeft('To (Player ID):', 0.4, 0.42, 0.35, 200, 200, 200);
            drawRect(0.5, 0.465, 0.2, 0.03, activeInput === 'phone1' ? 60 : 40, activeInput === 'phone1' ? 60 : 40, activeInput === 'phone1' ? 80 : 50, 255);
            drawTextLeft(phoneInput + (activeInput === 'phone1' ? '_' : ''), 0.41, 0.455, 0.35, 255, 255, 255);
            drawTextLeft('Message:', 0.4, 0.50, 0.35, 200, 200, 200);
            drawRect(0.5, 0.525, 0.2, 0.03, activeInput === 'phone2' ? 60 : 40, activeInput === 'phone2' ? 60 : 40, activeInput === 'phone2' ? 80 : 50, 255);
            drawTextLeft(phoneInput2 + (activeInput === 'phone2' ? '_' : ''), 0.41, 0.515, 0.35, 255, 255, 255);
            drawTextLeft('[TAB] Switch | [ENTER] Send | [ESC] Back', 0.4, 0.60, 0.3, 150, 150, 150);
        }
    }

    // Chat history (left side)
    if (!phoneOpen && !propertyInteractionOpen) {
        for (let i = 0; i < Math.min(chatHistory.length, 5); i++) {
            const alpha = 255 - i * 40;
            native.setTextFont(4);
            native.setTextScale(0.35, 0.35);
            native.setTextColour(255, 255, 255, alpha);
            native.setTextOutline();
            native.beginTextCommandDisplayText('STRING');
            native.addTextComponentSubstringPlayerName(chatHistory[i]);
            native.endTextCommandDisplayText(0.02, 0.8 + i * 0.025, 0);
        }
    }

    // Chat input box
    if (chatOpen) {
        drawRect(0.5, 0.95, 0.6, 0.04, 0, 0, 0, 180);
        const displayText = chatInput.length > 0 ? chatInput + '_' : 'Type message... (Enter to send, Esc to cancel)';
        native.setTextFont(4);
        native.setTextScale(0.35, 0.35);
        native.setTextColour(255, 255, 255, 255);
        native.beginTextCommandDisplayText('STRING');
        native.addTextComponentSubstringPlayerName(displayText);
        native.endTextCommandDisplayText(0.22, 0.94, 0);
    }

    // Help hint
    if (isLoggedIn && !chatOpen && !phoneOpen && !propertyInteractionOpen) {
        drawTextLeft('T: Chat | P: Phone | E: Interact | /help', 0.02, 0.02, 0.3, 150, 150, 150);
    }
});

// ============================================================================
// UNDER-MAP PROTECTION
// ============================================================================

alt.setInterval(() => {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    if (player.pos.z < -20) {
        forceSafeGroundSpawn(SAFE_SPAWN.x, SAFE_SPAWN.y, SAFE_SPAWN.z).catch(() => {});
    }
}, 3000);
