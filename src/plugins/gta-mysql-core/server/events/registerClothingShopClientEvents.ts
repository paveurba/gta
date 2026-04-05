import * as alt from 'alt-server';
import { CLOTHING_CATALOG } from '../services/index.js';
import type { ClothingShopService } from '../services/index.js';

export type ClothingShopHandlersContext = {
    getSession: (player: alt.Player) => { oderId: number; money: number } | undefined;
    clothingShopService: ClothingShopService;
    syncMoneyToClient: (player: alt.Player) => void;
    notifyPlayer: (player: alt.Player, message: string) => void;
};

export function registerClothingShopClientEvents(ctx: ClothingShopHandlersContext): void {
    const { getSession, clothingShopService, syncMoneyToClient, notifyPlayer } = ctx;

    alt.onClient('clothingshop:getCatalog', (player) => {
        alt.emitClient(player, 'clothingshop:catalog', CLOTHING_CATALOG);
    });

    alt.onClient('clothingshop:preview', (player, component: number, drawable: number, texture: number) => {
        clothingShopService.previewClothing(player, component, drawable, texture);
    });

    alt.onClient('clothingshop:buy', async (player, component: number, drawable: number, texture: number) => {
        const session = getSession(player);
        if (!session) { notifyPlayer(player, 'You must login first'); return; }
        const result = await clothingShopService.buyClothing(player, session.oderId, component, drawable, texture, session.money);
        notifyPlayer(player, result.message);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
        }
    });
}
