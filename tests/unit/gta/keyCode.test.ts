import { describe, expect, it } from 'vitest';

import { keyCodeFromAltKey } from '../../../src/plugins/gta-mysql-core/client/keyCode.js';

describe('keyCodeFromAltKey', () => {
    it('returns numeric key as-is', () => {
        expect(keyCodeFromAltKey(13 as any)).toBe(13);
        expect(keyCodeFromAltKey(69 as any)).toBe(69);
    });
});
