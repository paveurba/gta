import * as alt from 'alt-server';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 300;

const windows = new Map<number, { start: number; n: number }>();

function allow(playerId: number): boolean {
    const now = Date.now();
    let w = windows.get(playerId);
    if (!w || now - w.start > WINDOW_MS) {
        windows.set(playerId, { start: now, n: 1 });
        return true;
    }
    w.n += 1;
    return w.n <= MAX_PER_WINDOW;
}

/** Client diagnostics: see `client/diagnosticsForwarder.ts`. */
export function registerDiagnosticsClientEvents(): void {
    alt.onClient('gta:clientDiag', (player, level: string, message: string) => {
        if (typeof level !== 'string' || typeof message !== 'string') return;
        if (level.length > 32) return;
        if (message.length > 12_000) return;
        if (!allow(player.id)) return;

        const safeLevel = level.replace(/\s+/g, ' ');
        const preview = message.length > 8000 ? `${message.slice(0, 8000)}…` : message;
        alt.log(`[gta-client-diag] #${player.id} ${player.name} [${safeLevel}] ${preview}`);
    });
}
