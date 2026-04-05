import * as alt from 'alt-server';
import type { CasinoService } from '../services/index.js';

export type CasinoHandlersContext = {
    getSession: (player: alt.Player) => { oderId: number; money: number } | undefined;
    casinoService: CasinoService;
    syncMoneyToClient: (player: alt.Player) => void;
    notifyPlayer: (player: alt.Player, message: string) => void;
};

export function registerCasinoClientEvents(ctx: CasinoHandlersContext): void {
    const { getSession, casinoService, syncMoneyToClient, notifyPlayer } = ctx;

    alt.onClient('casino:playSlots', async (player, betAmount: number) => {
        const session = getSession(player);
        if (!session) { notifyPlayer(player, 'You must login first'); return; }
        const result = await casinoService.playSlots(session.oderId, betAmount, session.money);
        notifyPlayer(player, result.message);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
            alt.emitClient(player, 'casino:slotsResult', result.result);
        }
    });

    alt.onClient('casino:playRoulette', async (player, betAmount: number, betType: string, betValue: number | string) => {
        const session = getSession(player);
        if (!session) { notifyPlayer(player, 'You must login first'); return; }
        const result = await casinoService.playRoulette(session.oderId, betAmount, betType as any, betValue, session.money);
        notifyPlayer(player, result.message);
        if (result.success && result.newBalance !== undefined) {
            session.money = result.newBalance;
            syncMoneyToClient(player);
            alt.emitClient(player, 'casino:rouletteResult', result.result);
        }
    });

    alt.onClient('casino:getHistory', async (player) => {
        const session = getSession(player);
        if (!session) return;
        const history = await casinoService.getPlayerHistory(session.oderId);
        alt.emitClient(player, 'casino:history', history);
    });
}
