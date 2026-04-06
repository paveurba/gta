import { describe, expect, it, vi } from 'vitest';

vi.mock('alt-server', () => ({
    default: { log: vi.fn() },
    log: vi.fn(),
}));

import { PropertyService, type Property } from '../../../src/plugins/gta-mysql-core/server/services/PropertyService.js';

function forSaleProperty(overrides: Partial<Property> = {}): Property {
    return {
        id: 7,
        name: 'Beach House',
        price: 100_000,
        owner_player_id: null,
        pos_x: 0,
        pos_y: 0,
        pos_z: 0,
        interior_x: 1,
        interior_y: 2,
        interior_z: 3,
        interior_heading: 0,
        ipl: null,
        purchased_at: null,
        garage_slots: 2,
        garage_x: null,
        garage_y: null,
        garage_z: null,
        garage_heading: 0,
        ...overrides,
    };
}

describe('PropertyService buyProperty / sellProperty', () => {
    it('buy: not found', async () => {
        const execute = vi.fn().mockResolvedValueOnce([[]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const r = await svc.buyProperty(1, 99, 500_000);
        expect(r.success).toBe(false);
        expect(r.message).toContain('not found');
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('buy: already owned', async () => {
        const execute = vi.fn().mockResolvedValueOnce([[forSaleProperty({ owner_player_id: 2 })]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const r = await svc.buyProperty(1, 7, 500_000);
        expect(r.success).toBe(false);
        expect(r.message).toContain('already owned');
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('buy: insufficient funds', async () => {
        const execute = vi.fn().mockResolvedValueOnce([[forSaleProperty()]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const r = await svc.buyProperty(5, 7, 50_000);
        expect(r.success).toBe(false);
        expect(r.message).toContain('Not enough money');
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('buy: success updates ownership, money, and returns new balance', async () => {
        const listed = forSaleProperty();
        const owned = { ...listed, owner_player_id: 5, purchased_at: new Date('2026-01-01') };
        const execute = vi
            .fn()
            .mockResolvedValueOnce([[listed]])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([[owned]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const playerMoney = 150_000;
        const r = await svc.buyProperty(5, 7, playerMoney);

        expect(r.success).toBe(true);
        expect(r.newBalance).toBe(playerMoney - listed.price);
        expect(r.property?.owner_player_id).toBe(5);
        expect(execute).toHaveBeenCalledTimes(5);
    });

    it('sell: not found', async () => {
        const execute = vi.fn().mockResolvedValueOnce([[]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const r = await svc.sellProperty(1, 99, 10_000);
        expect(r.success).toBe(false);
        expect(r.message).toContain('not found');
    });

    it('sell: wrong owner', async () => {
        const execute = vi.fn().mockResolvedValueOnce([[forSaleProperty({ owner_player_id: 2 })]]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const r = await svc.sellProperty(1, 7, 10_000);
        expect(r.success).toBe(false);
        expect(r.message).toContain('do not own');
    });

    it('sell: success clears owner and credits 70%', async () => {
        const owned = forSaleProperty({ owner_player_id: 3, price: 100_000 });
        const execute = vi
            .fn()
            .mockResolvedValueOnce([[owned]])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
        const pool = { execute } as any;
        const svc = new PropertyService(pool);

        const playerMoney = 5_000;
        const r = await svc.sellProperty(3, 7, playerMoney);

        expect(r.success).toBe(true);
        expect(r.newBalance).toBe(playerMoney + 70_000);
        expect(execute).toHaveBeenCalledTimes(4);
    });
});
