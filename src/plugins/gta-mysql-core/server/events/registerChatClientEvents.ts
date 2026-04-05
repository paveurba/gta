import * as alt from 'alt-server';
import type { PlayerSession } from '../types/playerSession.js';

export type ChatClientContext = {
    playerSessions: Map<number, PlayerSession>;
    notifyPlayer: (player: alt.Player, message: string) => void;
    handleCommand: (player: alt.Player, command: string, args: string[]) => Promise<void>;
};

export function registerChatClientEvents(ctx: ChatClientContext): void {
    const { playerSessions, notifyPlayer, handleCommand } = ctx;

    alt.onClient('gta:chat:send', async (player, msg: string) => {
        if (!msg || msg.trim().length === 0) return;

        if (msg.startsWith('/')) {
            const args = msg.slice(1).split(' ');
            const command = args.shift()?.toLowerCase();
            await handleCommand(player, command || '', args);
            return;
        }

        const session = playerSessions.get(player.id);
        const name = session ? session.email.split('@')[0] : `Player${player.id}`;
        for (const p of alt.Player.all) {
            if (p.valid) notifyPlayer(p, `${name}: ${msg}`);
        }
    });
}
