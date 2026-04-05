import * as alt from 'alt-server';
import mysql from 'mysql2/promise';

export interface PlayerVehicle {
    id: number;
    player_id: number;
    model: string;
    model_hash: number;
    color_primary: number;
    color_secondary: number;
    garage_property_id: number | null;
    pos_x: number | null;
    pos_y: number | null;
    pos_z: number | null;
    rot_x: number;
    rot_y: number;
    rot_z: number;
    is_spawned: boolean;
    purchased_at: Date;
}

export interface VehicleCatalogItem {
    name: string;
    model: string;
    hash: number;
    price: number;
    category: string;
}

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
    // Compacts
    { name: 'Blista', model: 'blista', hash: alt.hash('blista'), price: 8000, category: 'Compacts' },
    { name: 'Brioso R/A', model: 'brioso', hash: alt.hash('brioso'), price: 15000, category: 'Compacts' },
    { name: 'Issi', model: 'issi2', hash: alt.hash('issi2'), price: 12000, category: 'Compacts' },
    { name: 'Panto', model: 'panto', hash: alt.hash('panto'), price: 10000, category: 'Compacts' },
    
    // Sedans
    { name: 'Asea', model: 'asea', hash: alt.hash('asea'), price: 5000, category: 'Sedans' },
    { name: 'Fugitive', model: 'fugitive', hash: alt.hash('fugitive'), price: 18000, category: 'Sedans' },
    { name: 'Premier', model: 'premier', hash: alt.hash('premier'), price: 9000, category: 'Sedans' },
    { name: 'Schafter', model: 'schafter2', hash: alt.hash('schafter2'), price: 35000, category: 'Sedans' },
    { name: 'Tailgater', model: 'tailgater', hash: alt.hash('tailgater'), price: 45000, category: 'Sedans' },
    
    // Sports
    { name: 'Banshee', model: 'banshee', hash: alt.hash('banshee'), price: 85000, category: 'Sports' },
    { name: 'Buffalo', model: 'buffalo', hash: alt.hash('buffalo'), price: 25000, category: 'Sports' },
    { name: 'Comet', model: 'comet2', hash: alt.hash('comet2'), price: 100000, category: 'Sports' },
    { name: 'Elegy RH8', model: 'elegy2', hash: alt.hash('elegy2'), price: 95000, category: 'Sports' },
    { name: 'Feltzer', model: 'feltzer2', hash: alt.hash('feltzer2'), price: 130000, category: 'Sports' },
    { name: 'Jester', model: 'jester', hash: alt.hash('jester'), price: 180000, category: 'Sports' },
    
    // Super
    { name: 'Adder', model: 'adder', hash: alt.hash('adder'), price: 1000000, category: 'Super' },
    { name: 'Bullet', model: 'bullet', hash: alt.hash('bullet'), price: 155000, category: 'Super' },
    { name: 'Cheetah', model: 'cheetah', hash: alt.hash('cheetah'), price: 650000, category: 'Super' },
    { name: 'Entity XF', model: 'entityxf', hash: alt.hash('entityxf'), price: 795000, category: 'Super' },
    { name: 'Infernus', model: 'infernus', hash: alt.hash('infernus'), price: 440000, category: 'Super' },
    { name: 'Turismo R', model: 'turismor', hash: alt.hash('turismor'), price: 500000, category: 'Super' },
    { name: 'Zentorno', model: 'zentorno', hash: alt.hash('zentorno'), price: 725000, category: 'Super' },
    
    // Muscle
    { name: 'Dominator', model: 'dominator', hash: alt.hash('dominator'), price: 35000, category: 'Muscle' },
    { name: 'Gauntlet', model: 'gauntlet', hash: alt.hash('gauntlet'), price: 32000, category: 'Muscle' },
    { name: 'Phoenix', model: 'phoenix', hash: alt.hash('phoenix'), price: 15000, category: 'Muscle' },
    { name: 'Ruiner', model: 'ruiner', hash: alt.hash('ruiner'), price: 10000, category: 'Muscle' },
    { name: 'Sabre Turbo', model: 'sabregt', hash: alt.hash('sabregt'), price: 15000, category: 'Muscle' },
    
    // SUVs
    { name: 'Baller', model: 'baller', hash: alt.hash('baller'), price: 90000, category: 'SUVs' },
    { name: 'Cavalcade', model: 'cavalcade', hash: alt.hash('cavalcade'), price: 60000, category: 'SUVs' },
    { name: 'Granger', model: 'granger', hash: alt.hash('granger'), price: 35000, category: 'SUVs' },
    { name: 'Huntley S', model: 'huntley', hash: alt.hash('huntley'), price: 195000, category: 'SUVs' },
    
    // Motorcycles
    { name: 'Akuma', model: 'akuma', hash: alt.hash('akuma'), price: 9000, category: 'Motorcycles' },
    { name: 'Bati 801', model: 'bati', hash: alt.hash('bati'), price: 15000, category: 'Motorcycles' },
    { name: 'Double T', model: 'double', hash: alt.hash('double'), price: 12000, category: 'Motorcycles' },
    { name: 'Hakuchou', model: 'hakuchou', hash: alt.hash('hakuchou'), price: 82000, category: 'Motorcycles' },
    { name: 'PCJ-600', model: 'pcj', hash: alt.hash('pcj'), price: 9000, category: 'Motorcycles' },
    
    // Off-Road
    { name: 'BF Injection', model: 'bfinjection', hash: alt.hash('bfinjection'), price: 16000, category: 'Off-Road' },
    { name: 'Sanchez', model: 'sanchez', hash: alt.hash('sanchez'), price: 8000, category: 'Off-Road' },
    { name: 'Sandking', model: 'sandking', hash: alt.hash('sandking'), price: 38000, category: 'Off-Road' },
];

// Vehicle dealership locations
export const VEHICLE_DEALERSHIPS = [
    { name: 'Premium Deluxe Motorsport', x: -56.49, y: -1097.25, z: 26.42 },
    { name: 'Simeon\'s Dealership', x: -31.66, y: -1106.95, z: 26.42 },
];

export class VehicleService {
    private spawnedVehicles: Map<number, alt.Vehicle> = new Map();

    constructor(private pool: mysql.Pool) {}

    async getPlayerVehicles(playerId: number): Promise<PlayerVehicle[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM player_vehicles WHERE player_id = ? ORDER BY purchased_at DESC',
            [playerId]
        );
        return rows as PlayerVehicle[];
    }

    async getVehicleById(vehicleId: number): Promise<PlayerVehicle | null> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM player_vehicles WHERE id = ?',
            [vehicleId]
        );
        const vehicles = rows as PlayerVehicle[];
        return vehicles.length > 0 ? vehicles[0] : null;
    }

    async getGarageVehicles(playerId: number, propertyId: number): Promise<PlayerVehicle[]> {
        const [rows] = await this.pool.execute(
            'SELECT * FROM player_vehicles WHERE player_id = ? AND garage_property_id = ?',
            [playerId, propertyId]
        );
        return rows as PlayerVehicle[];
    }

    async countGarageVehicles(propertyId: number): Promise<number> {
        const [rows] = await this.pool.execute(
            'SELECT COUNT(*) as count FROM player_vehicles WHERE garage_property_id = ?',
            [propertyId]
        );
        return (rows as any[])[0].count;
    }

    /** Server-authoritative catalog match; client `price` is ignored (RPC keeps arg for compatibility). */
    private resolveCatalogVehicle(model: string, modelHash: number): VehicleCatalogItem | null {
        const normalized = model.trim().toLowerCase();
        const item = VEHICLE_CATALOG.find((v) => v.model === normalized && v.hash === modelHash);
        return item ?? null;
    }

    async buyVehicle(
        playerId: number,
        model: string,
        modelHash: number,
        _clientPrice: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; newBalance?: number; vehicleId?: number }> {
        const catalogItem = this.resolveCatalogVehicle(model, modelHash);
        if (!catalogItem) {
            return { success: false, message: 'Invalid vehicle or catalog mismatch' };
        }

        const price = catalogItem.price;
        if (playerMoney < price) {
            return { success: false, message: `Not enough money. Need $${price.toLocaleString()}` };
        }

        const newBalance = playerMoney - price;

        const [result] = await this.pool.execute(
            `INSERT INTO player_vehicles (player_id, model, model_hash, color_primary, color_secondary) 
             VALUES (?, ?, ?, 0, 0)`,
            [playerId, catalogItem.model, catalogItem.hash]
        );

        const vehicleId = (result as any).insertId;

        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        await this.pool.execute(
            `INSERT INTO transaction_logs (player_id, transaction_type, amount, description) 
             VALUES (?, 'vehicle_purchase', ?, ?)`,
            [playerId, -price, `Purchased ${catalogItem.model}`]
        );

        alt.log(`[VehicleService] Player ${playerId} bought ${catalogItem.model} for $${price}`);
        return {
            success: true,
            message: `Purchased ${catalogItem.model} for $${price.toLocaleString()}`,
            newBalance,
            vehicleId,
        };
    }

    async sellVehicle(
        playerId: number,
        vehicleId: number,
        playerMoney: number
    ): Promise<{ success: boolean; message: string; newBalance?: number }> {
        const vehicle = await this.getVehicleById(vehicleId);
        
        if (!vehicle) {
            return { success: false, message: 'Vehicle not found' };
        }

        if (vehicle.player_id !== playerId) {
            return { success: false, message: 'You don\'t own this vehicle' };
        }

        if (vehicle.is_spawned) {
            return { success: false, message: 'Store the vehicle in a garage first' };
        }

        const catalogItem = VEHICLE_CATALOG.find(v => v.model === vehicle.model);
        const sellPrice = catalogItem ? Math.floor(catalogItem.price * 0.6) : 5000;
        const newBalance = playerMoney + sellPrice;

        await this.pool.execute(
            'DELETE FROM player_vehicles WHERE id = ?',
            [vehicleId]
        );

        await this.pool.execute(
            'UPDATE players SET money = ? WHERE id = ?',
            [newBalance, playerId]
        );

        await this.pool.execute(
            `INSERT INTO transaction_logs (player_id, transaction_type, amount, description) 
             VALUES (?, 'vehicle_sale', ?, ?)`,
            [playerId, sellPrice, `Sold ${vehicle.model}`]
        );

        alt.log(`[VehicleService] Player ${playerId} sold ${vehicle.model} for $${sellPrice}`);
        return { success: true, message: `Sold ${vehicle.model} for $${sellPrice.toLocaleString()}`, newBalance };
    }

    async spawnVehicle(
        player: alt.Player,
        vehicleId: number,
        x: number,
        y: number,
        z: number,
        heading: number = 0
    ): Promise<{ success: boolean; message: string; vehicle?: alt.Vehicle }> {
        const dbVehicle = await this.getVehicleById(vehicleId);
        
        if (!dbVehicle) {
            return { success: false, message: 'Vehicle not found' };
        }

        if (dbVehicle.is_spawned) {
            return { success: false, message: 'Vehicle is already spawned' };
        }

        const vehicle = new alt.Vehicle(
            dbVehicle.model_hash,
            x, y, z,
            0, 0, heading * (Math.PI / 180)
        );

        vehicle.primaryColor = dbVehicle.color_primary;
        vehicle.secondaryColor = dbVehicle.color_secondary;
        vehicle.numberPlateText = `GTA${dbVehicle.id}`;

        this.spawnedVehicles.set(dbVehicle.id, vehicle);

        await this.pool.execute(
            'UPDATE player_vehicles SET is_spawned = TRUE, pos_x = ?, pos_y = ?, pos_z = ?, garage_property_id = NULL WHERE id = ?',
            [x, y, z, vehicleId]
        );

        alt.log(`[VehicleService] Spawned vehicle ${dbVehicle.model} (ID: ${vehicleId})`);
        return { success: true, message: `${dbVehicle.model} spawned`, vehicle };
    }

    async storeVehicle(
        playerId: number,
        vehicleId: number,
        propertyId: number,
        garageSlots: number
    ): Promise<{ success: boolean; message: string }> {
        const vehicle = await this.getVehicleById(vehicleId);
        
        if (!vehicle) {
            return { success: false, message: 'Vehicle not found' };
        }

        if (vehicle.player_id !== playerId) {
            return { success: false, message: 'You don\'t own this vehicle' };
        }

        const currentCount = await this.countGarageVehicles(propertyId);
        if (currentCount >= garageSlots) {
            return { success: false, message: `Garage is full (${garageSlots} slots)` };
        }

        const spawnedVehicle = this.spawnedVehicles.get(vehicleId);
        if (spawnedVehicle && spawnedVehicle.valid) {
            spawnedVehicle.destroy();
            this.spawnedVehicles.delete(vehicleId);
        }

        await this.pool.execute(
            'UPDATE player_vehicles SET is_spawned = FALSE, garage_property_id = ?, pos_x = NULL, pos_y = NULL, pos_z = NULL WHERE id = ?',
            [propertyId, vehicleId]
        );

        alt.log(`[VehicleService] Stored vehicle ${vehicle.model} (ID: ${vehicleId}) in property ${propertyId}`);
        return { success: true, message: `${vehicle.model} stored in garage` };
    }

    async storeNearbyVehicle(
        player: alt.Player,
        playerId: number,
        propertyId: number,
        garageSlots: number
    ): Promise<{ success: boolean; message: string }> {
        const nearbyVehicles = alt.Vehicle.all.filter(v => {
            if (!v.valid) return false;
            const dist = Math.sqrt(
                Math.pow(v.pos.x - player.pos.x, 2) +
                Math.pow(v.pos.y - player.pos.y, 2) +
                Math.pow(v.pos.z - player.pos.z, 2)
            );
            return dist < 10;
        });

        for (const vehicle of nearbyVehicles) {
            const plateText = vehicle.numberPlateText;
            if (plateText.startsWith('GTA')) {
                const vehicleId = parseInt(plateText.substring(3));
                const dbVehicle = await this.getVehicleById(vehicleId);
                if (dbVehicle && dbVehicle.player_id === playerId) {
                    return this.storeVehicle(playerId, vehicleId, propertyId, garageSlots);
                }
            }
        }

        return { success: false, message: 'No owned vehicle nearby' };
    }

    getSpawnedVehicle(vehicleId: number): alt.Vehicle | undefined {
        return this.spawnedVehicles.get(vehicleId);
    }

    async despawnAllPlayerVehicles(playerId: number): Promise<void> {
        const vehicles = await this.getPlayerVehicles(playerId);
        for (const vehicle of vehicles) {
            if (vehicle.is_spawned) {
                const spawnedVehicle = this.spawnedVehicles.get(vehicle.id);
                if (spawnedVehicle && spawnedVehicle.valid) {
                    spawnedVehicle.destroy();
                    this.spawnedVehicles.delete(vehicle.id);
                }
                await this.pool.execute(
                    'UPDATE player_vehicles SET is_spawned = FALSE WHERE id = ?',
                    [vehicle.id]
                );
            }
        }
    }

    async setVehicleColors(
        vehicleId: number,
        primary: number,
        secondary: number
    ): Promise<{ success: boolean; message: string }> {
        const vehicle = await this.getVehicleById(vehicleId);
        if (!vehicle) {
            return { success: false, message: 'Vehicle not found' };
        }

        await this.pool.execute(
            'UPDATE player_vehicles SET color_primary = ?, color_secondary = ? WHERE id = ?',
            [primary, secondary, vehicleId]
        );

        const spawnedVehicle = this.spawnedVehicles.get(vehicleId);
        if (spawnedVehicle && spawnedVehicle.valid) {
            spawnedVehicle.primaryColor = primary;
            spawnedVehicle.secondaryColor = secondary;
        }

        return { success: true, message: 'Vehicle colors updated' };
    }
}
