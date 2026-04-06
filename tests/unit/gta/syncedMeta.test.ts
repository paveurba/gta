import { describe, expect, it } from 'vitest';

import { NAMETAG_SYNCED_META } from '../../../src/plugins/gta-mysql-core/client/constants.js';
import {
    SYNCED_DISPLAY_NAME,
    displayTagFromEmail,
} from '../../../src/plugins/gta-mysql-core/server/constants/syncedMetaKeys.js';

describe('displayTagFromEmail', () => {
    it('returns substring before @', () => {
        expect(displayTagFromEmail('player@example.com')).toBe('player');
    });

    it('returns full string when there is no @', () => {
        expect(displayTagFromEmail('nolabel')).toBe('nolabel');
    });

    it('returns full string when @ is first character', () => {
        expect(displayTagFromEmail('@onlydomain.com')).toBe('@onlydomain.com');
    });

    it('returns empty string for empty input', () => {
        expect(displayTagFromEmail('')).toBe('');
    });

    it('uses first @ only', () => {
        expect(displayTagFromEmail('user@foo@bar')).toBe('user');
    });
});

describe('client/server synced meta key', () => {
    it('NAMETAG_SYNCED_META matches SYNCED_DISPLAY_NAME', () => {
        expect(NAMETAG_SYNCED_META).toBe(SYNCED_DISPLAY_NAME);
    });
});
