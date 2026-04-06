import { describe, expect, it, vi } from 'vitest';

vi.mock('alt-server', () => {
    const hash = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
        }
        return h >>> 0;
    };
    return {
        default: { hash, log: vi.fn(), Vehicle: class {} },
        hash,
        log: vi.fn(),
        Vehicle: class {},
    };
});

import { VehicleService, VEHICLE_CATALOG } from '../../../src/plugins/gta-mysql-core/server/services/VehicleService.js';

describe('VehicleService.buyVehicle', () => {
    it('rejects when model/hash does not match catalog', async () => {
        const execute = vi.fn();
        const pool = { execute } as any;
        const svc = new VehicleService(pool);

        const result = await svc.buyVehicle(1, 'not-a-real-model', 0, 999999, 1_000_000);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid');
        expect(execute).not.toHaveBeenCalled();
    });

    it('rejects when player cannot afford catalog price', async () => {
        const asea = VEHICLE_CATALOG.find((v) => v.model === 'asea');
        expect(asea).toBeDefined();

        const execute = vi.fn();
        const pool = { execute } as any;
        const svc = new VehicleService(pool);

        const result = await svc.buyVehicle(1, asea!.model, asea!.hash, 999999, asea!.price - 1);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Not enough money');
        expect(execute).not.toHaveBeenCalled();
    });

    it('inserts vehicle, updates money, logs transaction on success', async () => {
        const asea = VEHICLE_CATALOG.find((v) => v.model === 'asea');
        expect(asea).toBeDefined();

        const insertId = 42;
        const execute = vi
            .fn()
            .mockResolvedValueOnce([{ insertId, affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]);
        const pool = { execute } as any;
        const svc = new VehicleService(pool);

        const money = asea!.price + 1000;
        const result = await svc.buyVehicle(7, asea!.model, asea!.hash, 0, money);

        expect(result.success).toBe(true);
        expect(result.newBalance).toBe(money - asea!.price);
        expect(result.vehicleId).toBe(insertId);
        expect(execute).toHaveBeenCalledTimes(3);
    });
});
