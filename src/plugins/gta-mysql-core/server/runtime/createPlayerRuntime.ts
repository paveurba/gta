import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';
import mysql from 'mysql2/promise';
import type { Appearance } from '@Shared/types/appearance.js';
import type { PlayerSession } from '../types/playerSession.js';
import type {
    AppearanceService,
    ClothingShopService,
    PlayerWeaponService,
    PropertyService,
    VehicleService,
} from '../services/index.js';

type RebarRoot = ReturnType<typeof useRebar>;
type RebarDatabase = ReturnType<RebarRoot['database']['useDatabase']>;

export type PlayerRuntimeServices = {
    weapon: () => PlayerWeaponService;
    vehicle: () => VehicleService;
    property: () => PropertyService;
    appearance: () => AppearanceService;
    clothingShop: () => ClothingShopService;
};

export type PlayerRuntimeContext = {
    playerSessions: Map<number, PlayerSession>;
    playersInProperty: Map<number, number>;
    getMySQLPool: () => Promise<mysql.Pool>;
    rebar: RebarRoot;
    db: RebarDatabase;
    services: PlayerRuntimeServices;
};

const DEFAULT_SPAWN = { x: 425.1, y: -979.5, z: 30.7 };

export function createPlayerRuntime(ctx: PlayerRuntimeContext) {
    const { playerSessions, playersInProperty, getMySQLPool, rebar, db, services } = ctx;
    const { weapon, vehicle, property, appearance, clothingShop } = services;

    async function applyCharacterLook(player: alt.Player, playerId: number): Promise<void> {
        const app = await appearance().loadOrCreateDefaultAppearance(playerId, 1);
        rebar.player.usePlayerAppearance(player).apply(app);
        await clothingShop().loadPlayerClothing(player, playerId);
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
    }

    async function saveAndApplyAppearance(player: alt.Player, playerId: number, patch: Partial<Appearance>): Promise<Partial<Appearance>> {
        const current = await appearance().loadOrCreateDefaultAppearance(playerId, (patch.sex as 0 | 1 | undefined) ?? 1);
        const nextAppearance = { ...current, ...patch };
        await appearance().saveAppearance(playerId, nextAppearance);
        rebar.player.usePlayerAppearance(player).apply(nextAppearance);
        return nextAppearance;
    }

    async function completeLogin(player: alt.Player, session: PlayerSession): Promise<void> {
        playerSessions.set(player.id, session);
        player.setMeta('playerId', session.oderId);
        alt.emitClient(player, 'gta:playerId', session.oderId);
        await bindCharacterForPlayer(player, session.email);
        spawnPlayerSafe(player);
        await applyCharacterLook(player, session.oderId);
        await weapon().loadWeaponsToPlayer(player, session.oderId);
        syncMoneyToClient(player);
    }

    async function savePlayerMoney(email: string, money: number, bank: number): Promise<void> {
        const pool = await getMySQLPool();
        await pool.execute('UPDATE players SET money = ?, bank = ? WHERE email = ?', [money, bank, email]);
    }

    async function clearExistingSession(player: alt.Player): Promise<void> {
        const session = playerSessions.get(player.id);
        if (!session) return;
        await getMySQLPool();
        try {
            await weapon().savePlayerWeapons(player, session.oderId);
            await vehicle().despawnAllPlayerVehicles(session.oderId);
        } catch (err) {
            alt.logWarning(`[gta-mysql-core] clearExistingSession: ${(err as Error).message}`);
        }
        playerSessions.delete(player.id);
        playersInProperty.delete(player.id);
        player.deleteMeta('playerId');
    }

    async function bindCharacterForPlayer(player: alt.Player, email: string): Promise<void> {
        const characterBinder = rebar.document.character.useCharacterBinder(player, false);
        const existingChar = await db.get({ email }, rebar.database.CollectionNames.Characters);
        if (existingChar) {
            characterBinder.bind(existingChar as any);
            return;
        }
        const newChar = { email, account_id: email, name: email.split('@')[0], pos: DEFAULT_SPAWN, health: 200, armour: 0, cash: 5000, bank: 10000 };
        const insertedId = await db.create(newChar, rebar.database.CollectionNames.Characters);
        if (insertedId) {
            const char = await db.get({ _id: insertedId }, rebar.database.CollectionNames.Characters);
            if (char) characterBinder.bind(char as any);
        }
    }

    function spawnPlayerSafe(player: alt.Player): void {
        player.model = 'mp_m_freemode_01';
        player.spawn(DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z, 0);
        player.health = 200;
        alt.emitClient(player, 'gta:spawn:safe', DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, DEFAULT_SPAWN.z);
    }

    function notifyPlayer(player: alt.Player, message: string): void {
        alt.emitClient(player, 'gta:notify', message);
    }

    function syncMoneyToClient(player: alt.Player): void {
        const session = playerSessions.get(player.id);
        if (session) alt.emitClient(player, 'gta:money:update', session.money, session.bank);
    }

    async function broadcastPropertyUpdate(): Promise<void> {
        try {
            const allProperties = await property().getAllProperties();
            for (const p of alt.Player.all) {
                if (p.valid) alt.emitClient(p, 'property:list', allProperties);
            }
        } catch (err) {
            alt.logWarning(`[gta-mysql-core] Failed to broadcast property update: ${(err as Error).message}`);
        }
    }

    return {
        applyCharacterLook,
        clamp,
        saveAndApplyAppearance,
        completeLogin,
        savePlayerMoney,
        clearExistingSession,
        spawnPlayerSafe,
        notifyPlayer,
        syncMoneyToClient,
        broadcastPropertyUpdate,
    };
}
