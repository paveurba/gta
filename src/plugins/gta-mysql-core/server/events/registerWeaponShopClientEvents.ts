import * as alt from 'alt-server';
import { WEAPON_CATALOG } from '../services/index.js';
import type { WeaponShopService } from '../services/index.js';

export type WeaponShopHandlersContext = {
    getSession: (player: alt.Player) => { oderId: number; money: number } | undefined;
    weaponShopService: WeaponShopService;
    syncMoneyToClient: (player: alt.Player) => void;
    notifyPlayer: (player: alt.Player, message: string) => void;
};

export function registerWeaponShopClientEvents(ctx: WeaponShopHandlersContext): void {
    const { getSession, weaponShopService, syncMoneyToClient, notifyPlayer } = ctx;

    alt.onClient('weaponshop:getCatalog', (player) => {
        alt.emitClient(player, 'weaponshop:catalog', WEAPON_CATALOG);
    });

    alt.onClient('weaponshop:buy', async (player, weaponHash: number) => {
        const session = getSession(player);
        if (!session) { notifyPlayer(player, 'You must login first'); return; }
        const result = await weaponShopService.buyWeapon(player, session.oderId, weaponHash, session.money);
        notifyPlayer(player, result.message);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
        }
    });

    alt.onClient('weaponshop:buyAmmo', async (player, weaponHash: number, amount: number) => {
        const session = getSession(player);
        if (!session) { notifyPlayer(player, 'You must login first'); return; }
        const result = await weaponShopService.buyAmmo(player, session.oderId, weaponHash, amount, session.money);
        notifyPlayer(player, result.message);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
        }
    });
}
