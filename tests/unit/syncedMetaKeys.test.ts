import { describe, expect, it } from 'vitest';

import { displayTagFromEmail } from '../../src/plugins/gta-mysql-core/server/constants/syncedMetaKeys.js';

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

    it('uses first @ only (extra @ in local part ignored for slice end)', () => {
        expect(displayTagFromEmail('user@foo@bar')).toBe('user');
    });

    it('allows single-character local part', () => {
        expect(displayTagFromEmail('a@example.com')).toBe('a');
    });

    it('returns lone @ unchanged (@ at index 0)', () => {
        expect(displayTagFromEmail('@')).toBe('@');
    });
});
