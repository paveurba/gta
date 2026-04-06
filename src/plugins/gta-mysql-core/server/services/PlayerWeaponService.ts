import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface PlayerWeapon {
    id?: number;
    player_id: number;
    weapon_hash: number;
    ammo: number;
}

export class PlayerWeaponService {
    constructor(private pool: mysql.Pool) {}

    async getPlayerWeapons(playerId: number): Promise<PlayerWeapon[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM player_weapons WHERE player_id = ?',
            [playerId]
        );
        return rows as PlayerWeapon[];
    }

    async saveWeapon(playerId: number, weaponHash: number, ammo: number): Promise<void> {
        await this.pool.execute(
            `INSERT INTO player_weapons (player_id, weapon_hash, ammo) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE ammo = ?`,
            [playerId, weaponHash, ammo, ammo]
        );
        alt.log(`[PlayerWeaponService] Saved weapon ${weaponHash} for player ${playerId}`);
    }

    async removeWeapon(playerId: number, weaponHash: number): Promise<void> {
        await this.pool.execute(
            'DELETE FROM player_weapons WHERE player_id = ? AND weapon_hash = ?',
            [playerId, weaponHash]
        );
        alt.log(`[PlayerWeaponService] Removed weapon ${weaponHash} from player ${playerId}`);
    }

    async clearPlayerWeapons(playerId: number): Promise<void> {
        await this.pool.execute(
            'DELETE FROM player_weapons WHERE player_id = ?',
            [playerId]
        );
    }

    async loadWeaponsToPlayer(player: alt.Player, playerId: number): Promise<void> {
        const weapons = await this.getPlayerWeapons(playerId);
        for (const weapon of weapons) {
            player.giveWeapon(weapon.weapon_hash, weapon.ammo, false);
        }
        alt.log(`[PlayerWeaponService] Loaded ${weapons.length} weapons for player ${playerId}`);
    }

    async savePlayerWeapons(player: alt.Player, playerId: number): Promise<void> {
        const weapons = player.weapons;
        for (const weapon of weapons) {
            const ammo = player.getWeaponAmmo(weapon.hash);
            await this.pool.execute(
                `INSERT INTO player_weapons (player_id, weapon_hash, ammo)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE ammo = ?`,
                [playerId, weapon.hash, ammo, ammo],
            );
        }
        alt.log(`[PlayerWeaponService] Saved ${weapons.length} weapons for player ${playerId}`);
    }
}
