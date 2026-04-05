import * as alt from 'alt-server';
import type { PlayerSession } from '../types/playerSession.js';
import type { PropertyService, PlayerWeaponService } from '../services/index.js';
import {
    WEAPON_SHOP_LOCATIONS,
    CLOTHING_SHOP_LOCATIONS,
    CASINO_LOCATIONS,
} from '../services/index.js';

export type PlayerLifecycleContext = {
    playerSessions: Map<number, PlayerSession>;
    playersInProperty: Map<number, number>;
    propertyService: PropertyService;
    weaponService: PlayerWeaponService;
    spawnPlayerSafe: (player: alt.Player) => void;
    notifyPlayer: (player: alt.Player, message: string) => void;
    savePlayerMoney: (email: string, money: number, bank: number) => Promise<void>;
    syncMoneyToClient: (player: alt.Player) => void;
    applyCharacterLook: (player: alt.Player, playerId: number) => Promise<void>;
};

/** Street-level spawn points in front of each hospital (not on roof or inside building). */
interface HospitalSpawn {
    x: number;
    y: number;
    z: number;
    heading: number;
    name: string;
}

const HOSPITAL_SPAWNS: HospitalSpawn[] = [
    { x: 307.32, y: -595.38, z: 43.29, heading: 70, name: 'Pillbox Hill Medical Center' },
    { x: -449.67, y: -340.55, z: 34.51, heading: 0, name: 'Mount Zonah Medical Center' },
    { x: 1839.44, y: 3672.71, z: 34.28, heading: 0, name: 'Sandy Shores Medical Center' },
    { x: -247.46, y: 6331.23, z: 32.43, heading: 0, name: 'Paleto Bay Medical Center' },
];

const HOSPITAL_FEE = 500;

function getNearestHospital(x: number, y: number, z: number): HospitalSpawn {
    let nearest = HOSPITAL_SPAWNS[0];
    let minDist = Infinity;

    for (const hospital of HOSPITAL_SPAWNS) {
        const dist = Math.sqrt(
            Math.pow(hospital.x - x, 2) + Math.pow(hospital.y - y, 2) + Math.pow(hospital.z - z, 2)
        );
        if (dist < minDist) {
            minDist = dist;
            nearest = hospital;
        }
    }

    return nearest;
}

export function registerPlayerLifecycleEvents(ctx: PlayerLifecycleContext): void {
    const {
        playerSessions,
        playersInProperty,
        propertyService,
        weaponService,
        spawnPlayerSafe,
        notifyPlayer,
        savePlayerMoney,
        syncMoneyToClient,
        applyCharacterLook,
    } = ctx;

    alt.on('playerConnect', async (player) => {
        alt.log(`[gta-mysql-core] Player connected: ${player.id}`);
        spawnPlayerSafe(player);
        notifyPlayer(player, 'Welcome! Press T to open Login / Register. Press M for phone when logged in.');

        alt.emitClient(player, 'gta:locations:update', {
            weaponShops: WEAPON_SHOP_LOCATIONS,
            clothingShops: CLOTHING_SHOP_LOCATIONS,
            casinos: CASINO_LOCATIONS,
        });

        try {
            const allProperties = await propertyService.getAllProperties();
            alt.emitClient(player, 'property:list', allProperties);
        } catch (err) {
            alt.logWarning(`[gta-mysql-core] Failed to load properties for blips: ${(err as Error).message}`);
        }
    });

    alt.on('playerDisconnect', async (player) => {
        const session = playerSessions.get(player.id);
        if (session) {
            await savePlayerMoney(session.email, session.money, session.bank);
            if (player.valid) {
                try {
                    await weaponService.savePlayerWeapons(player, session.oderId);
                } catch (err) {
                    alt.logWarning(`[gta-mysql-core] Could not save weapons: ${(err as Error).message}`);
                }
            }
            alt.log(`[gta-mysql-core] Saved data for ${session.email}`);
        }
        playerSessions.delete(player.id);
        playersInProperty.delete(player.id);
    });

    alt.on('playerDeath', async (player, _killer, _weaponHash) => {
        const session = playerSessions.get(player.id);
        const deathPos = player.pos;

        alt.log(`[gta-mysql-core] Player ${player.id} died at ${deathPos.x}, ${deathPos.y}, ${deathPos.z}`);

        const hospital = getNearestHospital(deathPos.x, deathPos.y, deathPos.z);
        alt.log(
            `[gta-mysql-core] Respawn: player ${player.id} -> ${hospital.name} at ${hospital.x}, ${hospital.y}, ${hospital.z}`
        );

        alt.setTimeout(async () => {
            if (!player.valid) return;

            const spawnX = hospital.x;
            const spawnY = hospital.y;
            const spawnZ = hospital.z;
            const spawnHeading = hospital.heading;

            alt.log(
                `[gta-mysql-core] Respawn applying: spawn(${spawnX}, ${spawnY}, ${spawnZ}) heading=${spawnHeading}`
            );
            player.spawn(spawnX, spawnY, spawnZ, spawnHeading);
            player.health = 200;
            player.armour = 0;

            if (session) {
                if (session.money >= HOSPITAL_FEE) {
                    session.money -= HOSPITAL_FEE;
                    await savePlayerMoney(session.email, session.money, session.bank);
                    syncMoneyToClient(player);
                    notifyPlayer(player, `Respawned at ${hospital.name}. Hospital fee: $${HOSPITAL_FEE}`);
                } else {
                    notifyPlayer(player, `Respawned at ${hospital.name}. (No fee - insufficient funds)`);
                }
                await applyCharacterLook(player, session.oderId);
                await weaponService.loadWeaponsToPlayer(player, session.oderId);
            } else {
                notifyPlayer(player, `Respawned at ${hospital.name}`);
            }

            playersInProperty.delete(player.id);

            alt.log(`[gta-mysql-core] Respawn done, emitting gta:spawn:safe (no coords)`);
            alt.emitClient(player, 'gta:spawn:safe');
        }, 5000);

        notifyPlayer(player, 'You died! Respawning in 5 seconds...');
    });
}
