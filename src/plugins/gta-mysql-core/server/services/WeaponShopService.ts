import * as alt from 'alt-server';
import mysql from 'mysql2/promise';
import { PlayerWeaponService } from './PlayerWeaponService.js';

export interface WeaponItem {
    name: string;
    hash: number;
    price: number;
    ammo: number;
    category: string;
}

export const WEAPON_CATALOG: WeaponItem[] = [
    // Pistols
    { name: 'Pistol', hash: 0x1B06D571, price: 500, ammo: 100, category: 'pistol' },
    { name: 'Combat Pistol', hash: 0x5EF9FEC4, price: 800, ammo: 100, category: 'pistol' },
    { name: 'AP Pistol', hash: 0x22D8FE39, price: 1200, ammo: 100, category: 'pistol' },
    { name: 'Heavy Pistol', hash: 0xD205520E, price: 1500, ammo: 100, category: 'pistol' },
    
    // SMGs
    { name: 'Micro SMG', hash: 0x13532244, price: 1800, ammo: 150, category: 'smg' },
    { name: 'SMG', hash: 0x2BE6766B, price: 2500, ammo: 150, category: 'smg' },
    { name: 'Combat PDW', hash: 0x0A3D4D34, price: 3000, ammo: 150, category: 'smg' },
    
    // Rifles
    { name: 'Assault Rifle', hash: 0xBFEFFF6D, price: 5000, ammo: 200, category: 'rifle' },
    { name: 'Carbine Rifle', hash: 0x83BF0278, price: 6000, ammo: 200, category: 'rifle' },
    { name: 'Advanced Rifle', hash: 0xAF113F99, price: 8000, ammo: 200, category: 'rifle' },
    
    // Shotguns
    { name: 'Pump Shotgun', hash: 0x1D073A89, price: 3500, ammo: 50, category: 'shotgun' },
    { name: 'Sawed-Off Shotgun', hash: 0x7846A318, price: 2500, ammo: 50, category: 'shotgun' },
    
    // Sniper
    { name: 'Sniper Rifle', hash: 0x05FC3C11, price: 8000, ammo: 30, category: 'sniper' },
    { name: 'Heavy Sniper', hash: 0x0C472FE2, price: 12000, ammo: 30, category: 'sniper' },
    
    // Melee
    { name: 'Knife', hash: 0x99B507EA, price: 100, ammo: 0, category: 'melee' },
    { name: 'Bat', hash: 0x958A4A8F, price: 80, ammo: 0, category: 'melee' },
    { name: 'Crowbar', hash: 0x84BD7BFD, price: 120, ammo: 0, category: 'melee' },
    
    // Special
    { name: 'Body Armor', hash: 0, price: 1500, ammo: 0, category: 'armor' },
];

export const WEAPON_SHOP_LOCATIONS = [
    { x: 19.80, y: -1106.90, z: 29.80, name: 'Ammu-Nation' },
    { x: -661.90, y: -933.50, z: 21.83, name: 'Ammu-Nation' },
    { x: 811.20, y: -2159.40, z: 29.62, name: 'Ammu-Nation' },
    { x: 1692.80, y: 3761.40, z: 34.71, name: 'Ammu-Nation' },
    { x: -330.70, y: 6085.20, z: 31.45, name: 'Ammu-Nation' },
    { x: 2569.30, y: 292.40, z: 108.73, name: 'Ammu-Nation' },
];

export class WeaponShopService {
    constructor(
        private pool: mysql.Pool,
        private weaponService: PlayerWeaponService
    ) {}

    getWeaponCatalog(): WeaponItem[] {
        return WEAPON_CATALOG;
    }

    getWeaponsByCategory(category: string): WeaponItem[] {
        return WEAPON_CATALOG.filter(w => w.category === category);
    }

    getWeaponByHash(hash: number): WeaponItem | undefined {
        return WEAPON_CATALOG.find(w => w.hash === hash);
    }

    getShopLocations() {
        return WEAPON_SHOP_LOCATIONS;
    }

    isNearShop(x: number, y: number, z: number, radius: number = 10): boolean {
        return WEAPON_SHOP_LOCATIONS.some(shop => {
            const dist = Math.sqrt(
                Math.pow(shop.x - x, 2) + 
                Math.pow(shop.y - y, 2) + 
                Math.pow(shop.z - z, 2)
            );
            return dist < radius;
        });
    }

    async buyWeapon(
        player: alt.Player,
        playerId: number,
        weaponHash: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const weapon = this.getWeaponByHash(weaponHash);
        
        if (!weapon) {
            return { success: false, message: 'Weapon not found' };
        }

        if (playerMoney < weapon.price) {
            return { success: false, message: 'Not enough money' };
        }

        // Handle armor separately
        if (weapon.category === 'armor') {
            player.armour = 100;
        } else {
            player.giveWeapon(weaponHash, weapon.ammo, true);
            await this.weaponService.saveWeapon(playerId, weaponHash, weapon.ammo);
        }

        // Deduct money
        const newBalance = playerMoney - weapon.price;
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logTransaction(playerId, 'WEAPON_BUY', weapon.price, `Bought ${weapon.name}`);

        alt.log(`[WeaponShopService] Player ${playerId} bought ${weapon.name} for $${weapon.price}`);
        return { success: true, message: `Purchased ${weapon.name}!`, newBalance };
    }

    async buyAmmo(
        player: alt.Player,
        playerId: number,
        weaponHash: number,
        ammoAmount: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const pricePerBullet = 2;
        const totalPrice = ammoAmount * pricePerBullet;

        if (playerMoney < totalPrice) {
            return { success: false, message: 'Not enough money' };
        }

        // Add ammo to player
        const currentWeapon = player.weapons.find(w => w.hash === weaponHash);
        if (currentWeapon) {
            player.giveWeapon(weaponHash, currentWeapon.totalAmmo + ammoAmount, false);
            await this.weaponService.saveWeapon(playerId, weaponHash, currentWeapon.totalAmmo + ammoAmount);
        }

        // Deduct money
        const newBalance = playerMoney - totalPrice;
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        alt.log(`[WeaponShopService] Player ${playerId} bought ${ammoAmount} ammo for $${totalPrice}`);
        return { success: true, message: `Bought ${ammoAmount} ammo!`, newBalance };
    }

    private async logTransaction(playerId: number, type: string, amount: number, description: string): Promise<void> {
        await this.pool.execute(
            'INSERT INTO transaction_logs (player_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
            [playerId, type, amount, description]
        );
    }
}
