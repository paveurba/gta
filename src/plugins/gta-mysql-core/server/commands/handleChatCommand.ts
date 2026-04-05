import * as alt from 'alt-server';
import type { Appearance } from '@Shared/types/appearance.js';
import type { PlayerSession } from '../types/playerSession.js';
import {
    type PropertyService,
    type VehicleService,
    type CasinoService,
    type PhoneService,
    type AppearanceService,
    type ClothingShopService,
    type WeaponShopService,
    type PlayerWeaponService,
    buildPropertyInteriorEnterPayload,
    sendTestEmail,
    WEAPON_CATALOG,
} from '../services/index.js';
import { SYNCED_DISPLAY_NAME } from '../constants/syncedMetaKeys.js';

export type ChatCommandDeps = {
    notifyPlayer: (player: alt.Player, message: string) => void;
    getSession: (player: alt.Player) => PlayerSession | undefined;
    playerSessions: Map<number, PlayerSession>;
    playersInProperty: Map<number, number>;
    weaponService: PlayerWeaponService;
    vehicleService: VehicleService;
    propertyService: PropertyService;
    casinoService: CasinoService;
    phoneService: PhoneService;
    appearanceService: AppearanceService;
    clothingShopService: ClothingShopService;
    weaponShopService: WeaponShopService;
    savePlayerMoney: (email: string, money: number, bank: number) => Promise<void>;
    syncMoneyToClient: (player: alt.Player) => void;
    broadcastPropertyUpdate: () => Promise<void>;
    buildPropertyInteriorEnterPayload: typeof buildPropertyInteriorEnterPayload;
    sendTestEmail: typeof sendTestEmail;
    clamp: (value: number, min: number, max: number) => number;
    saveAndApplyAppearance: (player: alt.Player, playerId: number, patch: Partial<Appearance>) => Promise<Partial<Appearance>>;
};

export async function handleChatCommand(
    deps: ChatCommandDeps,
    player: alt.Player,
    command: string,
    args: string[]
): Promise<void> {
    const session = deps.getSession(player);
    const {
        notifyPlayer,
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
        buildPropertyInteriorEnterPayload: buildInterior,
        sendTestEmail: sendTest,
        clamp,
        saveAndApplyAppearance,
    } = deps;

    switch (command) {
        case 'register':
        case 'login': {
            notifyPlayer(player, 'Use the Auth menu (press T) to login or register.');
            break;
        }
        case 'logout': {
            if (!session) { notifyPlayer(player, 'You are not logged in'); return; }
            try {
                await weaponService.savePlayerWeapons(player, session.oderId);
                await vehicleService.despawnAllPlayerVehicles(session.oderId);
                playerSessions.delete(player.id);
                player.deleteMeta('playerId');
                player.deleteSyncedMeta(SYNCED_DISPLAY_NAME);
                alt.emitClient(player, 'gta:logout');
                player.removeAllWeapons();
                notifyPlayer(player, 'You have been logged out. Press T to open the Auth menu to login again.');
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
        case 'faceinfo': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const appearance = await appearanceService.loadOrCreateDefaultAppearance(session.oderId, 1);
            notifyPlayer(
                player,
                `Face: father=${appearance.faceFather ?? 0} mother=${appearance.faceMother ?? 0} skinFather=${appearance.skinFather ?? 0} skinMother=${appearance.skinMother ?? 0} faceMix=${appearance.faceMix ?? 0.5} skinMix=${appearance.skinMix ?? 0.5} sex=${appearance.sex ?? 1}`
            );
            notifyPlayer(player, 'Use /face <father> <mother> <skinFather> <skinMother> <faceMix 0-1> <skinMix 0-1>');
            notifyPlayer(player, 'Use /sex <male|female> if you need to switch the freemode base first.');
            break;
        }
        case 'face': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            if (args.length < 6) {
                notifyPlayer(player, 'Usage: /face <father> <mother> <skinFather> <skinMother> <faceMix 0-1> <skinMix 0-1>');
                return;
            }

            const faceFather = Number(args[0]);
            const faceMother = Number(args[1]);
            const skinFather = Number(args[2]);
            const skinMother = Number(args[3]);
            const faceMix = Number(args[4]);
            const skinMix = Number(args[5]);

            if ([faceFather, faceMother, skinFather, skinMother, faceMix, skinMix].some((value) => Number.isNaN(value))) {
                notifyPlayer(player, 'Invalid face values. /face expects 4 integers and 2 mix values.');
                return;
            }

            const saved = await saveAndApplyAppearance(player, session.oderId, {
                faceFather: clamp(Math.round(faceFather), 0, 45),
                faceMother: clamp(Math.round(faceMother), 0, 45),
                skinFather: clamp(Math.round(skinFather), 0, 45),
                skinMother: clamp(Math.round(skinMother), 0, 45),
                faceMix: clamp(faceMix, 0, 1),
                skinMix: clamp(skinMix, 0, 1),
            });

            notifyPlayer(
                player,
                `Face updated. father=${saved.faceFather} mother=${saved.faceMother} skinFather=${saved.skinFather} skinMother=${saved.skinMother} faceMix=${saved.faceMix} skinMix=${saved.skinMix}`
            );
            break;
        }
        case 'sex': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const value = (args[0] || '').toLowerCase();
            if (value !== 'male' && value !== 'female') {
                notifyPlayer(player, 'Usage: /sex <male|female>');
                return;
            }

            const sex = value === 'female' ? 0 : 1;
            await saveAndApplyAppearance(player, session.oderId, { sex });
            await clothingShopService.loadPlayerClothing(player, session.oderId);
            notifyPlayer(player, `Base model updated to ${value}. Use /faceinfo to see current face settings.`);
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
            const interiorChat = buildInterior(nearbyProp);
            if (!interiorChat) {
                notifyPlayer(player, 'Property interior is not configured. Contact an administrator.');
                break;
            }
            playersInProperty.set(player.id, nearbyProp.id);
            alt.emitClient(player, 'property:enterResult', {
                success: true,
                message: `Entered ${nearbyProp.name}`,
                interior: interiorChat,
            });
            break;
        }
        case 'exit': {
            const propId = playersInProperty.get(player.id);
            if (!propId) { notifyPlayer(player, 'You are not inside a property'); return; }
            const prop = await propertyService.getPropertyById(propId);
            if (prop) {
                alt.emitClient(player, 'property:exitResult', {
                    success: true,
                    message: `Exited ${prop.name}`,
                    exterior: {
                        x: prop.pos_x,
                        y: prop.pos_y,
                        z: prop.pos_z,
                    },
                });
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
        case 'myvehicles': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const vehicles = await vehicleService.getPlayerVehicles(session.oderId);
            if (vehicles.length === 0) {
                notifyPlayer(player, 'You don\'t own any vehicles. Visit a dealership!');
                return;
            }
            notifyPlayer(player, `Your vehicles (${vehicles.length}):`);
            vehicles.forEach(v => {
                const status = v.is_spawned ? 'Spawned' : v.garage_property_id ? 'In Garage' : 'Stored';
                notifyPlayer(player, `[${v.id}] ${v.model} - ${status}`);
            });
            break;
        }
        case 'spawnvehicle': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            const vehicleId = parseInt(args[0]);
            if (!vehicleId) { notifyPlayer(player, 'Usage: /spawnvehicle <vehicleId>'); return; }
            const pos = player.pos;
            const heading = player.rot.z * (180 / Math.PI);
            const result = await vehicleService.spawnVehicle(player, vehicleId, pos.x + 3, pos.y, pos.z, heading);
            notifyPlayer(player, result.message);
            break;
        }
        case 'dealership': {
            if (!session) { notifyPlayer(player, 'You must login first'); return; }
            player.pos = new alt.Vector3(-56.49, -1097.25, 26.42);
            notifyPlayer(player, 'Teleported to Premium Deluxe Motorsport');
            break;
        }
        case 'testmail': {
            const toEmail = args[0]?.trim() || (session?.email ?? '');
            if (!toEmail) {
                notifyPlayer(player, 'Usage: /testmail <email> (or login and use /testmail to send to your account email)');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(toEmail)) {
                notifyPlayer(player, 'Please enter a valid email address.');
                return;
            }
            notifyPlayer(player, `Sending test email to ${toEmail}...`);
            const result = await sendTest(toEmail);
            if (result.success) {
                notifyPlayer(player, 'Test email sent. Check the inbox (and spam folder) for that address.');
            } else {
                notifyPlayer(player, result.error === 'Mail not configured' ? 'Mail not configured. Set MAIL_* in .env.' : `Failed: ${result.error}`);
            }
            break;
        }
        case 'help': {
            notifyPlayer(player, '=== Commands ===');
            notifyPlayer(player, '/register, /login, /logout, /money');
            notifyPlayer(player, '/weapons, /buyweapon <name>');
            notifyPlayer(player, '/properties, /myproperties');
            notifyPlayer(player, '/myvehicles, /spawnvehicle <id>, /dealership');
            notifyPlayer(player, '/slots <bet>, /roulette <bet> <type> <value>');
            notifyPlayer(player, '/contact, /contacts, /sms');
            notifyPlayer(player, '/tp <x> <y> <z>, /casino');
            notifyPlayer(player, '/testmail <email> – send test email (checks mail config)');
            notifyPlayer(player, 'Press E near shops/properties to interact');
            notifyPlayer(player, 'Press M for phone menu');
            break;
        }
        default:
            notifyPlayer(player, `Unknown command: /${command}. Use /help`);
    }
}
