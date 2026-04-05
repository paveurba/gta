import * as alt from 'alt-server';
import {
    type PropertyService,
    type VehicleService,
    VEHICLE_CATALOG,
} from '../services/index.js';

/** Session fields vehicle RPCs read or update */
export type VehicleMoneySession = {
    oderId: number;
    money: number;
};

export type VehicleHandlersContext = {
    getSession: (player: alt.Player) => VehicleMoneySession | undefined;
    vehicleService: VehicleService;
    propertyService: PropertyService;
    syncMoneyToClient: (player: alt.Player) => void;
    notifyPlayer: (player: alt.Player, message: string) => void;
};

export function registerVehicleClientEvents(ctx: VehicleHandlersContext): void {
    const { getSession, vehicleService, propertyService, syncMoneyToClient, notifyPlayer } = ctx;

    alt.onClient('vehicle:getCatalog', (player) => {
        alt.emitClient(player, 'vehicle:catalog', VEHICLE_CATALOG);
    });

    alt.onClient('vehicle:getMyVehicles', async (player) => {
        const session = getSession(player);
        if (!session) return;
        const vehicles = await vehicleService.getPlayerVehicles(session.oderId);
        alt.emitClient(player, 'vehicle:myVehicles', vehicles);
    });

    alt.onClient('vehicle:buy', async (player, model: string, modelHash: number, price: number) => {
        const session = getSession(player);
        if (!session) {
            alt.emitClient(player, 'vehicle:buyResult', { success: false, message: 'You must login first' });
            return;
        }
        const result = await vehicleService.buyVehicle(session.oderId, model, modelHash, price, session.money);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);

            if (result.vehicleId) {
                const pos = player.pos;
                const rot = player.rot;
                const spawnX = pos.x + Math.sin(-rot.z) * 3;
                const spawnY = pos.y + Math.cos(-rot.z) * 3;
                const spawnZ = pos.z;
                const headingDeg = rot.z * (180 / Math.PI);
                await vehicleService.spawnVehicle(player, result.vehicleId, spawnX, spawnY, spawnZ, headingDeg);
                alt.log(`[gta-mysql-core] Auto-spawned vehicle ${result.vehicleId} for player ${session.oderId}`);
            }
        }
        alt.emitClient(player, 'vehicle:buyResult', result);
    });

    alt.onClient('vehicle:sell', async (player, vehicleId: number) => {
        const session = getSession(player);
        if (!session) {
            alt.emitClient(player, 'vehicle:sellResult', { success: false, message: 'You must login first' });
            return;
        }
        const result = await vehicleService.sellVehicle(session.oderId, vehicleId, session.money);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
        }
        alt.emitClient(player, 'vehicle:sellResult', result);
    });

    alt.onClient('vehicle:spawn', async (player, vehicleId: number) => {
        const session = getSession(player);
        if (!session) {
            notifyPlayer(player, 'You must login first');
            return;
        }
        const pos = player.pos;
        const heading = player.rot.z * (180 / Math.PI);
        const result = await vehicleService.spawnVehicle(player, vehicleId, pos.x + 3, pos.y, pos.z, heading);
        notifyPlayer(player, result.message);
    });

    alt.onClient('vehicle:store', async (player, vehicleId: number, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            notifyPlayer(player, 'You must login first');
            return;
        }
        const property = await propertyService.getPropertyById(propertyId);
        if (!property) {
            notifyPlayer(player, 'Property not found');
            return;
        }
        if (property.owner_player_id !== session.oderId) {
            notifyPlayer(player, "You don't own this property");
            return;
        }
        const garageSlots = (property as { garage_slots?: number }).garage_slots || 2;
        const result = await vehicleService.storeVehicle(session.oderId, vehicleId, propertyId, garageSlots);
        notifyPlayer(player, result.message);
        if (result.success) {
            const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
            alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
        }
    });

    alt.onClient('vehicle:storeNearby', async (player, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            notifyPlayer(player, 'You must login first');
            return;
        }
        const property = await propertyService.getPropertyById(propertyId);
        if (!property) {
            notifyPlayer(player, 'Property not found');
            return;
        }
        if (property.owner_player_id !== session.oderId) {
            notifyPlayer(player, "You don't own this property");
            return;
        }
        const garageSlots = (property as { garage_slots?: number }).garage_slots || 2;
        const result = await vehicleService.storeNearbyVehicle(player, session.oderId, propertyId, garageSlots);
        notifyPlayer(player, result.message);
        if (result.success) {
            const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
            alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
        }
    });

    alt.onClient('vehicle:getGarageVehicles', async (player, propertyId: number) => {
        const session = getSession(player);
        if (!session) return;
        const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
        alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
    });

    alt.onClient('vehicle:spawnFromGarage', async (player, vehicleId: number, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            notifyPlayer(player, 'You must login first');
            return;
        }
        const property = await propertyService.getPropertyById(propertyId);
        if (!property) {
            notifyPlayer(player, 'Property not found');
            return;
        }
        if (property.owner_player_id !== session.oderId) {
            notifyPlayer(player, "You don't own this property");
            return;
        }
        const dbVehicle = await vehicleService.getVehicleById(vehicleId);
        if (!dbVehicle) {
            notifyPlayer(player, 'Vehicle not found');
            return;
        }
        if (dbVehicle.player_id !== session.oderId) {
            notifyPlayer(player, "You don't own this vehicle");
            return;
        }
        if (dbVehicle.garage_property_id !== propertyId) {
            notifyPlayer(player, 'This vehicle is not stored in this garage');
            return;
        }
        if (dbVehicle.is_spawned) {
            notifyPlayer(player, 'Vehicle is already spawned');
            return;
        }
        const garageX = (property as { garage_x?: number }).garage_x || property.pos_x;
        const garageY = (property as { garage_y?: number }).garage_y || property.pos_y;
        const garageZ = (property as { garage_z?: number }).garage_z || property.pos_z;
        const garageHeading = (property as { garage_heading?: number }).garage_heading || 0;

        const result = await vehicleService.spawnVehicle(player, vehicleId, garageX, garageY, garageZ, garageHeading);
        notifyPlayer(player, result.message);
        if (result.success) {
            const vehicles = await vehicleService.getGarageVehicles(session.oderId, propertyId);
            alt.emitClient(player, 'vehicle:garageVehicles', vehicles);
        }
    });
}
