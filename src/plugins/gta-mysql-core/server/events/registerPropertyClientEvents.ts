import * as alt from 'alt-server';
import {
    type PropertyService,
    buildPropertyInteriorEnterPayload,
} from '../services/index.js';

export type PropertyMoneySession = {
    oderId: number;
    money: number;
};

export type PropertyHandlersContext = {
    getSession: (player: alt.Player) => PropertyMoneySession | undefined;
    propertyService: PropertyService;
    playersInProperty: Map<number, number>;
    syncMoneyToClient: (player: alt.Player) => void;
    broadcastPropertyUpdate: () => Promise<void>;
};

export function registerPropertyClientEvents(ctx: PropertyHandlersContext): void {
    const { getSession, propertyService, playersInProperty, syncMoneyToClient, broadcastPropertyUpdate } = ctx;

    alt.onClient('property:getList', async (player) => {
        const properties = await propertyService.getAllProperties();
        alt.emitClient(player, 'property:list', properties);
    });

    alt.onClient('property:requestList', async (player) => {
        const properties = await propertyService.getAllProperties();
        alt.emitClient(player, 'property:list', properties);
    });

    alt.onClient('property:buy', async (player, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            alt.emitClient(player, 'property:buyResult', { success: false, message: 'You must login first' });
            return;
        }
        const result = await propertyService.buyProperty(session.oderId, propertyId, session.money);
        alt.emitClient(player, 'property:buyResult', result);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
            broadcastPropertyUpdate();
        }
    });

    alt.onClient('property:sell', async (player, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            alt.emitClient(player, 'property:sellResult', { success: false, message: 'You must login first' });
            return;
        }
        const result = await propertyService.sellProperty(session.oderId, propertyId, session.money);
        alt.emitClient(player, 'property:sellResult', result);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
            broadcastPropertyUpdate();
        }
    });

    alt.onClient('property:enter', async (player, propertyId: number) => {
        const session = getSession(player);
        if (!session) {
            alt.emitClient(player, 'property:enterResult', { success: false, message: 'You must login first' });
            return;
        }
        const property = await propertyService.getPropertyById(propertyId);
        if (!property) {
            alt.emitClient(player, 'property:enterResult', { success: false, message: 'Property not found' });
            return;
        }
        if (property.owner_player_id !== session.oderId) {
            alt.emitClient(player, 'property:enterResult', { success: false, message: 'You do not own this property' });
            return;
        }

        const interior = buildPropertyInteriorEnterPayload(property);
        if (!interior) {
            alt.logWarning(
                `[gta-mysql-core] property:enter propertyId=${propertyId} has invalid interior coords — fix in DB`
            );
            alt.emitClient(player, 'property:enterResult', {
                success: false,
                message: 'Property interior is not configured. Contact an administrator.',
            });
            return;
        }

        alt.log(
            `[gta-mysql-core] property:enter player=${player.id} propertyId=${propertyId} name=${property.name} interior=${interior.x}, ${interior.y}, ${interior.z}`
        );
        playersInProperty.set(player.id, propertyId);
        alt.emitClient(player, 'property:enterResult', {
            success: true,
            message: `Entered ${property.name}`,
            interior,
        });
    });

    alt.onClient('property:exit', async (player, _propertyId: number) => {
        const currentPropertyId = playersInProperty.get(player.id);

        if (!currentPropertyId) {
            alt.emitClient(player, 'property:exitResult', { success: false, message: 'You are not inside a property' });
            return;
        }

        const property = await propertyService.getPropertyById(currentPropertyId);
        if (!property) {
            alt.emitClient(player, 'property:exitResult', { success: false, message: 'Property not found' });
            return;
        }

        playersInProperty.delete(player.id);
        alt.emitClient(player, 'property:exitResult', {
            success: true,
            message: `Exited ${property.name}`,
            exterior: {
                x: property.pos_x,
                y: property.pos_y,
                z: property.pos_z,
            },
        });
    });
}
