import { describe, expect, it } from 'vitest';

import { isValidEmail, isValidUsername } from '../../../src/plugins/gta-mysql-core/server/auth/authValidation.js';

describe('authValidation', () => {
    describe('isValidEmail', () => {
        it('accepts a normal address', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
        });

        it('rejects missing @ or domain', () => {
            expect(isValidEmail('notanemail')).toBe(false);
            expect(isValidEmail('a@')).toBe(false);
            expect(isValidEmail('@b.co')).toBe(false);
        });

        it('rejects whitespace in local or domain', () => {
            expect(isValidEmail('user name@example.com')).toBe(false);
            expect(isValidEmail('user@exam ple.com')).toBe(false);
        });

        it('rejects when longer than 255 chars', () => {
            const local = 'a'.repeat(252);
            expect(isValidEmail(`${local}@x.co`)).toBe(false);
        });
    });

    describe('isValidUsername', () => {
        it('accepts 3–32 alnum underscore hyphen', () => {
            expect(isValidUsername('ab')).toBe(false);
            expect(isValidUsername('abc')).toBe(true);
            expect(isValidUsername('User_9-ok')).toBe(true);
            expect(isValidUsername('a'.repeat(32))).toBe(true);
        });

        it('rejects over 32 chars or invalid chars', () => {
            expect(isValidUsername('a'.repeat(33))).toBe(false);
            expect(isValidUsername('no spaces')).toBe(false);
            expect(isValidUsername('bad!')).toBe(false);
        });
    });
});
