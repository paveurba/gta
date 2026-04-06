import type { KeyCode } from 'alt-shared';

/** Normalize alt:V key events to a numeric key code for comparisons (Enter=13, E=69, etc.). */
export function keyCodeFromAltKey(key: KeyCode): number {
    return typeof key === 'number' ? key : Number(key);
}
