import * as alt from 'alt-server';
import type { PhoneService } from '../services/index.js';

export type PhoneHandlersContext = {
    getSession: (player: alt.Player) => { oderId: number } | undefined;
    phoneService: PhoneService;
    notifyPlayer: (player: alt.Player, message: string) => void;
};

export function registerPhoneClientEvents(ctx: PhoneHandlersContext): void {
    const { getSession, phoneService, notifyPlayer } = ctx;

    alt.onClient('phone:getData', async (player) => {
        const session = getSession(player);
        if (!session) return;
        const data = await phoneService.getPhoneData(session.oderId);
        alt.emitClient(player, 'phone:data', data);
    });

    alt.onClient('phone:addContact', async (player, name: string, number: string) => {
        const session = getSession(player);
        if (!session) return;
        const result = await phoneService.addContact(session.oderId, name, number);
        notifyPlayer(player, result.message);
        if (result.success) {
            const data = await phoneService.getPhoneData(session.oderId);
            alt.emitClient(player, 'phone:data', data);
        }
    });

    alt.onClient('phone:deleteContact', async (player, contactId: number) => {
        const session = getSession(player);
        if (!session) return;
        const result = await phoneService.deleteContact(session.oderId, contactId);
        notifyPlayer(player, result.message);
    });

    alt.onClient('phone:sendMessage', async (player, receiverId: number, message: string) => {
        const session = getSession(player);
        if (!session) return;
        const result = await phoneService.sendMessage(session.oderId, receiverId, message);
        notifyPlayer(player, result.message);
    });
}
