import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendTemporaryPasswordEmailMock } = vi.hoisted(() => ({
    sendTemporaryPasswordEmailMock: vi.fn(),
}));

vi.mock('../../../src/plugins/gta-mysql-core/server/services/EmailService.js', () => ({
    sendTemporaryPasswordEmail: sendTemporaryPasswordEmailMock,
}));

vi.mock('alt-server', () => ({
    default: { log: vi.fn(), logError: vi.fn() },
    log: vi.fn(),
    logError: vi.fn(),
}));

import bcrypt from 'bcryptjs';

import { AuthService, type PlayerRow } from '../../../src/plugins/gta-mysql-core/server/services/AuthService.js';

function playerRow(partial: Partial<PlayerRow> & Pick<PlayerRow, 'email' | 'username' | 'password_hash'>): PlayerRow {
    return {
        id: partial.id ?? 1,
        email: partial.email,
        username: partial.username,
        password_hash: partial.password_hash,
        money: partial.money ?? 5000,
        bank: partial.bank ?? 10000,
        password_change_required: partial.password_change_required ?? false,
        temp_password_hash: partial.temp_password_hash ?? null,
        temp_password_expires_at: partial.temp_password_expires_at ?? null,
    };
}

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sendTemporaryPasswordEmailMock.mockResolvedValue({ success: true });
    });

    describe('register', () => {
        it('rejects missing fields without touching the pool', async () => {
            const execute = vi.fn();
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: '', email: 'a@b.co', password: 'secret12' });
            expect(r.success).toBe(false);
            expect(execute).not.toHaveBeenCalled();
        });

        it('rejects invalid username', async () => {
            const execute = vi.fn();
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: 'ab', email: 'a@b.co', password: 'secret12' });
            expect(r.success).toBe(false);
            expect(execute).not.toHaveBeenCalled();
        });

        it('rejects duplicate email', async () => {
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[playerRow({ email: 'a@b.co', username: 'x', password_hash: 'h' })]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: 'newuser', email: 'a@b.co', password: 'secret12' });
            expect(r.success).toBe(false);
            expect(r.message).toContain('email');
            expect(execute).toHaveBeenCalledTimes(1);
        });

        it('rejects duplicate username', async () => {
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[playerRow({ email: 'o@b.co', username: 'taken', password_hash: 'h' })]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: 'taken', email: 'new@b.co', password: 'secret12' });
            expect(r.success).toBe(false);
            expect(r.message).toContain('username');
            expect(execute).toHaveBeenCalledTimes(2);
        });

        it('succeeds after insert and reloads row', async () => {
            const created = playerRow({
                id: 42,
                email: 'fresh@b.co',
                username: 'fresh',
                password_hash: 'hashed',
            });
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }, []])
                .mockResolvedValueOnce([[created]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: 'fresh', email: 'fresh@b.co', password: 'secret12' });
            expect(r.success).toBe(true);
            expect(r.session?.playerId).toBe(42);
            expect(r.session?.email).toBe('fresh@b.co');
            expect(execute).toHaveBeenCalledTimes(4);
        });

        it('returns generic error when insert throws', async () => {
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[]])
                .mockRejectedValueOnce(new Error('ER_DUP_ENTRY'));
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.register({ username: 'usr', email: 'u@b.co', password: 'secret12' });
            expect(r.success).toBe(false);
            expect(r.message).toContain('Registration failed');
        });
    });

    describe('login', () => {
        it('rejects empty identifier', async () => {
            const execute = vi.fn();
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.login('  ', 'x');
            expect(r.success).toBe(false);
            expect(execute).not.toHaveBeenCalled();
        });

        it('rejects unknown user', async () => {
            const execute = vi.fn().mockResolvedValueOnce([[]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.login('nobody@here.co', 'secret12');
            expect(r.success).toBe(false);
            expect(r.message).toContain('Invalid');
        });

        it('rejects wrong password', async () => {
            const hash = await bcrypt.hash('right', 4);
            const row = playerRow({ email: 'e@b.co', username: 'e', password_hash: hash });
            const execute = vi.fn().mockResolvedValueOnce([[row]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.login('e@b.co', 'wrong');
            expect(r.success).toBe(false);
        });

        it('succeeds with main password and updates last_login', async () => {
            const hash = await bcrypt.hash('secret12', 4);
            const row = playerRow({ id: 3, email: 'e@b.co', username: 'e', password_hash: hash });
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[row]])
                .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.login('e@b.co', 'secret12');
            expect(r.success).toBe(true);
            expect(r.session?.playerId).toBe(3);
            expect(execute).toHaveBeenCalledTimes(2);
        });
    });

    describe('changePassword', () => {
        it('rejects when new and confirm differ', async () => {
            const pool = { execute: vi.fn() } as any;
            const svc = new AuthService(pool);
            const r = await svc.changePassword(1, 'a', 'b', 'c');
            expect(r.success).toBe(false);
            expect(pool.execute).not.toHaveBeenCalled();
        });

        it('rejects short new password', async () => {
            const pool = { execute: vi.fn() } as any;
            const svc = new AuthService(pool);
            const r = await svc.changePassword(1, 'oldpass', 'short', 'short');
            expect(r.success).toBe(false);
        });

        it('rejects wrong current password', async () => {
            const hash = await bcrypt.hash('real', 4);
            const row = playerRow({ email: 'e@b.co', username: 'e', password_hash: hash });
            const execute = vi.fn().mockResolvedValueOnce([[row]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.changePassword(1, 'nope', 'newpass1', 'newpass1');
            expect(r.success).toBe(false);
        });

        it('succeeds and updates hash', async () => {
            const hash = await bcrypt.hash('oldpass', 4);
            const row = playerRow({ id: 9, email: 'e@b.co', username: 'e', password_hash: hash });
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[row]])
                .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.changePassword(9, 'oldpass', 'newpass1', 'newpass1');
            expect(r.success).toBe(true);
            expect(execute).toHaveBeenCalledTimes(2);
        });
    });

    describe('requestPasswordReset', () => {
        it('rejects invalid email', async () => {
            const pool = { execute: vi.fn() } as any;
            const svc = new AuthService(pool);
            const r = await svc.requestPasswordReset('not-email');
            expect(r.success).toBe(false);
            expect(pool.execute).not.toHaveBeenCalled();
        });

        it('returns success when email not registered (no leak)', async () => {
            const execute = vi.fn().mockResolvedValueOnce([[]]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.requestPasswordReset('missing@b.co');
            expect(r.success).toBe(true);
            expect(sendTemporaryPasswordEmailMock).not.toHaveBeenCalled();
        });

        it('sets temp hash and sends mail when user exists', async () => {
            const row = playerRow({ id: 2, email: 'here@b.co', username: 'h', password_hash: 'x' });
            const execute = vi
                .fn()
                .mockResolvedValueOnce([[row]])
                .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
            const pool = { execute } as any;
            const svc = new AuthService(pool);

            const r = await svc.requestPasswordReset('here@b.co');
            expect(r.success).toBe(true);
            expect(sendTemporaryPasswordEmailMock).toHaveBeenCalledTimes(1);
            expect(execute).toHaveBeenCalledTimes(2);
        });
    });
});
