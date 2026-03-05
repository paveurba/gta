import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface ClothingItem {
    component: number;
    drawable: number;
    texture: number;
    name: string;
    price: number;
}

export interface PlayerClothing {
    id?: number;
    player_id: number;
    component: number;
    drawable: number;
    texture: number;
}

// Component IDs for GTA V
export const CLOTHING_COMPONENTS = {
    HEAD: 0,
    BEARD: 1,
    HAIR: 2,
    TORSO: 3,
    LEGS: 4,
    HANDS: 5,
    FEET: 6,
    EYES: 7,
    ACCESSORIES: 8,
    TASKS: 9,
    DECALS: 10,
    TOPS: 11,
};

export const CLOTHING_CATALOG: ClothingItem[] = [
    // Tops (component 11)
    { component: 11, drawable: 0, texture: 0, name: 'White T-Shirt', price: 50 },
    { component: 11, drawable: 1, texture: 0, name: 'Black T-Shirt', price: 50 },
    { component: 11, drawable: 15, texture: 0, name: 'Leather Jacket', price: 500 },
    { component: 11, drawable: 55, texture: 0, name: 'Business Suit', price: 1500 },
    { component: 11, drawable: 26, texture: 0, name: 'Hoodie', price: 200 },
    
    // Legs (component 4)
    { component: 4, drawable: 0, texture: 0, name: 'Blue Jeans', price: 100 },
    { component: 4, drawable: 1, texture: 0, name: 'Black Jeans', price: 100 },
    { component: 4, drawable: 10, texture: 0, name: 'Cargo Pants', price: 150 },
    { component: 4, drawable: 25, texture: 0, name: 'Suit Pants', price: 300 },
    { component: 4, drawable: 14, texture: 0, name: 'Shorts', price: 80 },
    
    // Feet (component 6)
    { component: 6, drawable: 1, texture: 0, name: 'Running Shoes', price: 150 },
    { component: 6, drawable: 5, texture: 0, name: 'Boots', price: 300 },
    { component: 6, drawable: 10, texture: 0, name: 'Dress Shoes', price: 400 },
    { component: 6, drawable: 15, texture: 0, name: 'Sandals', price: 50 },
    
    // Accessories (component 8)
    { component: 8, drawable: 15, texture: 0, name: 'Gold Chain', price: 1000 },
    { component: 8, drawable: 25, texture: 0, name: 'Silver Chain', price: 500 },
];

export const CLOTHING_SHOP_LOCATIONS = [
    { x: 72.25, y: -1399.10, z: 29.38, name: 'Suburban (Innocence Blvd)' },
    { x: -167.86, y: -298.97, z: 39.73, name: 'Ponsonbys (Rockford Hills)' },
    { x: -1193.42, y: -772.26, z: 17.32, name: 'Binco (Del Perro)' },
    { x: 428.69, y: -800.41, z: 29.49, name: 'Discount Store (Pillbox Hill)' },
    { x: -703.78, y: -152.26, z: 37.42, name: 'Ponsonbys (Burton)' },
    { x: -1447.80, y: -242.46, z: 49.82, name: 'Suburban (Chumash)' },
    { x: 123.65, y: -219.44, z: 54.56, name: 'Suburban (Hawick)' },
    { x: 614.09, y: 2762.81, z: 42.09, name: 'Discount Store (Harmony)' },
];

export class ClothingShopService {
    constructor(private pool: mysql.Pool) {}

    getClothingCatalog(): ClothingItem[] {
        return CLOTHING_CATALOG;
    }

    getClothingByComponent(component: number): ClothingItem[] {
        return CLOTHING_CATALOG.filter(c => c.component === component);
    }

    getShopLocations() {
        return CLOTHING_SHOP_LOCATIONS;
    }

    isNearShop(x: number, y: number, z: number, radius: number = 10): boolean {
        return CLOTHING_SHOP_LOCATIONS.some(shop => {
            const dist = Math.sqrt(
                Math.pow(shop.x - x, 2) + 
                Math.pow(shop.y - y, 2) + 
                Math.pow(shop.z - z, 2)
            );
            return dist < radius;
        });
    }

    async getPlayerClothing(playerId: number): Promise<PlayerClothing[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM player_clothes WHERE player_id = ?',
            [playerId]
        );
        return rows as PlayerClothing[];
    }

    async saveClothing(playerId: number, component: number, drawable: number, texture: number): Promise<void> {
        await this.pool.execute(
            `INSERT INTO player_clothes (player_id, component, drawable, texture) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE drawable = ?, texture = ?`,
            [playerId, component, drawable, texture, drawable, texture]
        );
    }

    async buyClothing(
        player: alt.Player,
        playerId: number,
        component: number,
        drawable: number,
        texture: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const item = CLOTHING_CATALOG.find(
            c => c.component === component && c.drawable === drawable && c.texture === texture
        );
        
        const price = item?.price || 100; // Default price if not in catalog

        if (playerMoney < price) {
            return { success: false, message: 'Not enough money' };
        }

        // Apply clothing to player
        player.setClothes(component, drawable, texture, 0);
        
        // Save to database
        await this.saveClothing(playerId, component, drawable, texture);

        // Deduct money
        const newBalance = playerMoney - price;
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logTransaction(playerId, 'CLOTHING_BUY', price, `Bought clothing item`);

        alt.log(`[ClothingShopService] Player ${playerId} bought clothing for $${price}`);
        return { success: true, message: `Purchased clothing!`, newBalance };
    }

    previewClothing(player: alt.Player, component: number, drawable: number, texture: number): void {
        player.setClothes(component, drawable, texture, 0);
    }

    async loadPlayerClothing(player: alt.Player, playerId: number): Promise<void> {
        const clothes = await this.getPlayerClothing(playerId);
        for (const item of clothes) {
            player.setClothes(item.component, item.drawable, item.texture, 0);
        }
        alt.log(`[ClothingShopService] Loaded ${clothes.length} clothing items for player ${playerId}`);
    }

    private async logTransaction(playerId: number, type: string, amount: number, description: string): Promise<void> {
        await this.pool.execute(
            'INSERT INTO transaction_logs (player_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
            [playerId, type, amount, description]
        );
    }
}
