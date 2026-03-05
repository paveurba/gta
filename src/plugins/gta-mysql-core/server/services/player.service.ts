import * as alt from 'alt-server';

export interface AuthenticatedSession {
    userId: number;
    email: string;
}

export class PlayerService {
    private readonly defaultSpawn = { x: 425.1, y: -979.5, z: 30.7 };

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
        if (!player || !player.valid) {
            return;
        }

        player.model = 'mp_m_freemode_01';
        player.dimension = 0;
        // Mission Row Police Department; stable street-level spawn for testing.
        player.spawn(this.defaultSpawn.x, this.defaultSpawn.y, this.defaultSpawn.z, 0);
        player.emit('gta:spawn:safe', this.defaultSpawn.x, this.defaultSpawn.y, this.defaultSpawn.z);

        // Re-apply spawn once more after initial sync for clients that load collision slowly.
        alt.setTimeout(() => {
            if (!player.valid) {
                return;
            }

            player.dimension = 0;
            player.spawn(this.defaultSpawn.x, this.defaultSpawn.y, this.defaultSpawn.z + 0.5, 0);
            player.emit('gta:spawn:safe', this.defaultSpawn.x, this.defaultSpawn.y, this.defaultSpawn.z);
        }, 2000);
    }
}
