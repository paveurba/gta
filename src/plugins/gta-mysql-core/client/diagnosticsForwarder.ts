/**
 * Forwards client console + alt.log output and resource script errors to the server for production debugging.
 * Rate-limited on client and server to reduce abuse and network spam.
 */
import * as alt from 'alt-client';

const EVENT = 'gta:clientDiag';
const MAX_MSG_CHARS = 6000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 200;

let windowStart = Date.now();
let count = 0;
let droppedInWindow = 0;
let warnedRateLimit = false;
let inForward = false;

function truncate(s: string): string {
    if (s.length <= MAX_MSG_CHARS) return s;
    return `${s.slice(0, MAX_MSG_CHARS)}…[truncated]`;
}

function formatArg(a: unknown): string {
    if (a === null) return 'null';
    if (a === undefined) return 'undefined';
    if (typeof a === 'string') return a;
    if (typeof a === 'number' || typeof a === 'boolean' || typeof a === 'bigint') return String(a);
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`;
    try {
        return JSON.stringify(a);
    } catch {
        return String(a);
    }
}

function formatArgs(args: unknown[]): string {
    return args.map(formatArg).join(' ');
}

function forward(level: string, message: string): void {
    if (inForward) return;

    const now = Date.now();
    if (now - windowStart > WINDOW_MS) {
        windowStart = now;
        count = 0;
        droppedInWindow = 0;
        warnedRateLimit = false;
    }

    count += 1;
    if (count > MAX_PER_WINDOW) {
        droppedInWindow += 1;
        if (!warnedRateLimit) {
            warnedRateLimit = true;
            inForward = true;
            try {
                alt.emitServer(
                    EVENT,
                    'warn',
                    `[gta-diag] client forward rate limit (${MAX_PER_WINDOW} msgs / ${WINDOW_MS / 1000}s); extra lines dropped this window`,
                );
            } catch {
                /* ignore */
            } finally {
                inForward = false;
            }
        }
        return;
    }

    const payload = truncate(message);
    inForward = true;
    try {
        alt.emitServer(EVENT, level, payload);
    } catch {
        /* ignore */
    } finally {
        inForward = false;
    }
}

function patchConsole(): void {
    const levels = ['log', 'info', 'debug', 'warn', 'error'] as const;
    for (const level of levels) {
        const orig = console[level] as (...args: unknown[]) => void;
        if (typeof orig !== 'function') continue;
        console[level] = (...args: unknown[]) => {
            orig.apply(console, args);
            forward(level, formatArgs(args));
        };
    }
}

patchConsole();

alt.on('resourceError', (error, file, line, stackTrace) => {
    const msg = error?.message ?? String(error);
    forward('error', `resourceError ${file}:${line} ${msg}\n${stackTrace ?? ''}`);
});
