import * as alt from 'alt-server';

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
        if (!player || !player.valid) {
            return;
        }

        player.emit('gta:notify', message);
        alt.log(`[gta-mysql-core][p${player.id}] ${message}`);
    }

    spawnDefault(player: alt.Player): void {
        player.model = 'mp_m_freemode_01';
        player.dimension = 0;
        // Airport apron spawn; reliable ground level for initial testing.
        player.spawn(-1036.73, -2738.04, 20.17, 0);
    }
}
