import { describe, expect, it, vi } from 'vitest';

import { DatabaseService } from '../../../src/plugins/gta-mysql-core/server/services/database.service.js';

describe('DatabaseService', () => {
    it('query forwards execute and returns rows', async () => {
        const rows = [{ id: 1, email: 'a@b.c' }];
        const execute = vi.fn().mockResolvedValue([rows, []]);
        const pool = { execute } as any;
        const db = new DatabaseService(pool);

        const result = await db.query<{ id: number; email: string }>('SELECT 1', { email: 'a@b.c' });

        expect(execute).toHaveBeenCalledWith('SELECT 1', { email: 'a@b.c' });
        expect(result).toEqual(rows);
    });

    it('execute forwards to pool', async () => {
        const execute = vi.fn().mockResolvedValue([{ affectedRows: 1 }, []]);
        const pool = { execute } as any;
        const db = new DatabaseService(pool);

        await db.execute('UPDATE x SET y = 1', { id: 1 });

        expect(execute).toHaveBeenCalledWith('UPDATE x SET y = 1', { id: 1 });
    });
});
