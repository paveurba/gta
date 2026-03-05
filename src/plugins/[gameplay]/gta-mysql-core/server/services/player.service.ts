import * as alt from 'alt-server';
import { useRebar } from '@Server/index.js';

export interface AuthenticatedSession {
    userId: number;
    email: string;
}

export class PlayerService {
    private readonly sessions = new Map<number, AuthenticatedSession>();

    setSession(player: alt.Player, session: AuthenticatedSession): void {
        this.sessions.set(player.id, session);
    }

    getSession(player: alt.Player): AuthenticatedSession | null {
        return this.sessions.get(player.id) ?? null;
    }

    clearSession(player: alt.Player): void {
        this.sessions.delete(player.id);
    }

    notify(player: alt.Player, message: string): void {
        const Rebar = useRebar();
        const rPlayer = Rebar.usePlayer(player);
        rPlayer.notify.sendMessage(message);
    }

    spawnDefault(player: alt.Player): void {
        player.model = 'mp_m_freemode_01';
        player.spawn(215.8, -810.1, 30.7, 0);
    }
}
