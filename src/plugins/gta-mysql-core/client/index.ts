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
}

let weaponShops: ShopLocation[] = [];
let clothingShops: ShopLocation[] = [];
let casinos: ShopLocation[] = [];
let properties: PropertyLocation[] = [];
const createdBlips: number[] = [];

// Blip sprite IDs for GTA V
const BLIP_SPRITES = {
    WEAPON_SHOP: 110,      // Gun icon
    CLOTHING_SHOP: 73,     // Shirt icon
    CASINO: 679,           // Casino chip icon
    PROPERTY_FOR_SALE: 374, // House for sale
    PROPERTY_OWNED: 40,    // House owned (safehouse)
};

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
        native.setBlipScale(blip, 0.8);
        native.setBlipAsShortRange(blip, true);
        native.beginTextCommandSetBlipName('STRING');
        const label = prop.owner_player_id === null ? `${prop.name} - $${prop.price.toLocaleString()}` : prop.name;
        native.addTextComponentSubstringPlayerName(label);
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
    createMapBlips();
});

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
    if (phoneOpen) return;
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
    if (chatOpen || phoneOpen) return;
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
    isLoggedIn = true;
});

// ============================================================================
// SAFE SPAWN
// ============================================================================

async function forceSafeGroundSpawn(x: number, y: number, z: number): Promise<void> {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    native.requestCollisionAtCoord(x, y, z);
    native.setFocusPosAndVel(x, y, z + 50, 0, 0, 0);
    let groundZ = z;
    for (let scan = 0; scan <= 600; scan += 25) {
        const [found, result] = native.getGroundZFor3dCoord(x, y, scan, 0, false, false);
        if (found) { groundZ = result; break; }
    }
    native.setEntityCoordsNoOffset(player.scriptID, x, y, groundZ + 1.2, false, false, false);
    native.clearFocus();
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
    // Request and load casino IPLs
    CASINO_IPLS.forEach(ipl => {
        if (!native.isIplActive(ipl)) {
            native.requestIpl(ipl);
            alt.log(`[gta] Loaded IPL: ${ipl}`);
        }
    });

    // Set casino interior state
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
    // Disable all ambient population - called every frame
    native.setVehicleDensityMultiplierThisFrame(0.0);
    native.setRandomVehicleDensityMultiplierThisFrame(0.0);
    native.setParkedVehicleDensityMultiplierThisFrame(0.0);
    native.setPedDensityMultiplierThisFrame(0.0);
    native.setScenarioPedDensityMultiplierThisFrame(0.0, 0.0);
    
    // Disable garbage trucks, random cars, etc.
    native.setGarbageTrucks(false);
    native.setRandomBoats(false);
    native.setRandomTrains(false);
}

function disablePopulationOnce(): void {
    // One-time settings
    native.setPedPopulationBudget(0);
    native.setVehiclePopulationBudget(0);
    native.setRandomEventFlag(false);
    native.setCreateRandomCops(false);
    native.setCreateRandomCopsNotOnScenarios(false);
    native.setCreateRandomCopsOnScenarios(false);
    
    // Disable dispatch services (police, ambulance, fire)
    native.enableDispatchService(1, false); // Police
    native.enableDispatchService(2, false); // Ambulance
    native.enableDispatchService(3, false); // Fire
    native.enableDispatchService(4, false); // Police Helicopter
    native.enableDispatchService(5, false); // Police Boats
    native.enableDispatchService(6, false); // Army
    
    alt.log('[gta] AI population disabled - GTA Online style');
}

// ============================================================================
// CONNECTION
// ============================================================================

alt.on('connectionComplete', () => {
    alt.log('[gta-client] Connection complete');
    
    // Load default IPLs
    alt.loadDefaultIpls();
    
    // Load casino interior
    loadCasinoInterior();
    
    // Disable AI population (one-time settings)
    disablePopulationOnce();
    
    // Request collision for common areas
    native.requestCollisionAtCoord(924.0, 46.0, 81.1); // Casino
});

// ============================================================================
// KEY HANDLING
// ============================================================================

let justOpened = false;
let shiftPressed = false;
let activeInput: 'chat' | 'phone1' | 'phone2' = 'chat';

alt.on('keydown', (key) => {
    if (key === 16 || key === 160 || key === 161) shiftPressed = true;
});

alt.on('keyup', (key) => {
    if (key === 16 || key === 160 || key === 161) { shiftPressed = false; return; }

    // P key (80) - Toggle phone
    if (key === 80 && !chatOpen) {
        if (phoneOpen) closePhone();
        else if (isLoggedIn) openPhone();
        return;
    }

    // T key (84) - Open chat
    if (key === 84 && !chatOpen && !phoneOpen) {
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

function handlePhoneKey(key: number): void {
    // Escape - Close or go back
    if (key === 27) {
        if (phoneTab === 'main') closePhone();
        else phoneTab = 'main';
        return;
    }

    // Number keys for menu selection
    if (phoneTab === 'main') {
        if (key === 49) { phoneTab = 'contacts'; return; } // 1 - Contacts
        if (key === 50) { phoneTab = 'messages'; return; } // 2 - Messages
        if (key === 51) { phoneTab = 'addContact'; phoneInput = ''; phoneInput2 = ''; activeInput = 'phone1'; return; } // 3 - Add Contact
        if (key === 52) { phoneTab = 'sendMessage'; phoneInput = ''; phoneInput2 = ''; activeInput = 'phone1'; return; } // 4 - Send Message
    }

    // Tab to switch input fields
    if (key === 9 && (phoneTab === 'addContact' || phoneTab === 'sendMessage')) {
        activeInput = activeInput === 'phone1' ? 'phone2' : 'phone1';
        return;
    }

    // Enter to submit
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

    // Text input for phone
    if (phoneTab === 'addContact' || phoneTab === 'sendMessage') {
        handleTextInput(key, activeInput);
    }
}

function handleTextInput(key: number, target: 'chat' | 'phone1' | 'phone2'): void {
    let input = target === 'chat' ? chatInput : target === 'phone1' ? phoneInput : phoneInput2;

    // Enter
    if (key === 13 && target === 'chat') { sendChat(); return; }
    // Escape
    if (key === 27 && target === 'chat') { closeChat(); return; }
    // Backspace
    if (key === 8) { input = input.slice(0, -1); }
    // Letters
    else if (key >= 65 && key <= 90) {
        const char = String.fromCharCode(key);
        input += shiftPressed ? char : char.toLowerCase();
    }
    // Numbers with shift
    else if (key >= 48 && key <= 57) {
        if (shiftPressed) {
            const shiftNumbers: { [k: number]: string } = { 48: ')', 49: '!', 50: '@', 51: '#', 52: '$', 53: '%', 54: '^', 55: '&', 56: '*', 57: '(' };
            input += shiftNumbers[key] || '';
        } else {
            input += String.fromCharCode(key);
        }
    }
    // Space
    else if (key === 32) { input += ' '; }
    // Special chars
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
// BLIP MARKERS FOR SHOPS
// ============================================================================

function drawShopMarkers(): void {
    const player = alt.Player.local;
    if (!player || !player.valid) return;
    const pos = player.pos;

    // Draw 3D markers for nearby shops
    [...weaponShops, ...clothingShops, ...casinos].forEach((shop, i) => {
        const dist = Math.sqrt(Math.pow(shop.x - pos.x, 2) + Math.pow(shop.y - pos.y, 2) + Math.pow(shop.z - pos.z, 2));
        if (dist < 100) {
            const isWeapon = weaponShops.includes(shop);
            const isClothing = clothingShops.includes(shop);
            const color = isWeapon ? [255, 100, 100] : isClothing ? [100, 100, 255] : [255, 215, 0];
            native.drawMarker(1, shop.x, shop.y, shop.z + 1, 0, 0, 0, 0, 0, 0, 1.5, 1.5, 1.5, color[0], color[1], color[2], 150, false, false, 2, false, null as any, null as any, false);
            
            if (dist < 20) {
                native.setTextFont(4);
                native.setTextScale(0.4, 0.4);
                native.setTextColour(255, 255, 255, 255);
                native.setTextOutline();
                native.setTextCentre(true);
                native.setDrawOrigin(shop.x, shop.y, shop.z + 2.5, false);
                native.beginTextCommandDisplayText('STRING');
                native.addTextComponentSubstringPlayerName(shop.name);
                native.endTextCommandDisplayText(0, 0, 0);
                native.clearDrawOrigin();
            }
        }
    });
}

// ============================================================================
// HUD DRAWING
// ============================================================================

alt.everyTick(() => {
    // Disable AI population every frame (required for some natives)
    disableAmbientPopulation();
    
    // Money HUD (top right)
    if (isLoggedIn) {
        drawText(`$${playerMoney.toLocaleString()}`, 0.98, 0.02, 0.5, 114, 204, 114);
        drawText(`Bank: $${playerBank.toLocaleString()}`, 0.98, 0.055, 0.35, 200, 200, 200);
    } else {
        drawText('Press T - /register or /login', 0.98, 0.02, 0.35, 255, 255, 255);
    }

    // Shop markers
    drawShopMarkers();

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
    if (!phoneOpen) {
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
    if (isLoggedIn && !chatOpen && !phoneOpen) {
        drawTextLeft('T: Chat | P: Phone | /help', 0.02, 0.02, 0.3, 150, 150, 150);
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
