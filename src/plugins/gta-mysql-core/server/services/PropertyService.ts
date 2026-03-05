import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface Property {
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
    purchased_at: Date | null;
}

export class PropertyService {
    constructor(private pool: mysql.Pool) {}

    async getAllProperties(): Promise<Property[]> {
        const [rows] = await this.pool.execute('SELECT * FROM properties');
        return rows as Property[];
    }

    async getAvailableProperties(): Promise<Property[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM properties WHERE owner_player_id IS NULL'
        );
        return rows as Property[];
    }

    async getPlayerProperties(playerId: number): Promise<Property[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM properties WHERE owner_player_id = ?',
            [playerId]
        );
        return rows as Property[];
    }

    async getPropertyById(propertyId: number): Promise<Property | null> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM properties WHERE id = ?',
            [propertyId]
        );
        const properties = rows as Property[];
        return properties.length > 0 ? properties[0] : null;
    }

    async buyProperty(playerId: number, propertyId: number, playerMoney: number): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const property = await this.getPropertyById(propertyId);
        
        if (!property) {
            return { success: false, message: 'Property not found' };
        }

        if (property.owner_player_id !== null) {
            return { success: false, message: 'Property already owned' };
        }

        if (playerMoney < property.price) {
            return { success: false, message: 'Not enough money' };
        }

        // Update property ownership
        await this.pool.execute(
            'UPDATE properties SET owner_player_id = ?, purchased_at = NOW() WHERE id = ?',
            [playerId, propertyId]
        );

        // Deduct money from player
        const newBalance = playerMoney - property.price;
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logTransaction(playerId, 'PROPERTY_BUY', property.price, `Bought ${property.name}`);

        alt.log(`[PropertyService] Player ${playerId} bought property ${property.name} for $${property.price}`);
        return { success: true, message: `Purchased ${property.name}!`, newBalance };
    }

    async sellProperty(playerId: number, propertyId: number, playerMoney: number): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const property = await this.getPropertyById(propertyId);
        
        if (!property) {
            return { success: false, message: 'Property not found' };
        }

        if (property.owner_player_id !== playerId) {
            return { success: false, message: 'You do not own this property' };
        }

        const sellPrice = Math.floor(property.price * 0.7); // 70% of original price

        // Remove ownership
        await this.pool.execute(
            'UPDATE properties SET owner_player_id = NULL, purchased_at = NULL WHERE id = ?',
            [propertyId]
        );

        // Add money to player
        const newBalance = playerMoney + sellPrice;
        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        // Log transaction
        await this.logTransaction(playerId, 'PROPERTY_SELL', sellPrice, `Sold ${property.name}`);

        alt.log(`[PropertyService] Player ${playerId} sold property ${property.name} for $${sellPrice}`);
        return { success: true, message: `Sold ${property.name} for $${sellPrice}!`, newBalance };
    }

    async canEnterProperty(playerId: number, propertyId: number): Promise<boolean> {
        const property = await this.getPropertyById(propertyId);
        return property !== null && property.owner_player_id === playerId;
    }

    async getPropertyAtPosition(x: number, y: number, z: number, radius: number = 5): Promise<Property | null> {
        const [rows] = await this.pool.execute(
            `SELECT * FROM properties 
             WHERE SQRT(POW(pos_x - ?, 2) + POW(pos_y - ?, 2) + POW(pos_z - ?, 2)) < ?`,
            [x, y, z, radius]
        );
        const properties = rows as Property[];
        return properties.length > 0 ? properties[0] : null;
    }

    private async logTransaction(playerId: number, type: string, amount: number, description: string): Promise<void> {
        await this.pool.execute(
            'INSERT INTO transaction_logs (player_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
            [playerId, type, amount, description]
        );
    }
}
