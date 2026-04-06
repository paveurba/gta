import { describe, expect, it, vi } from 'vitest';

vi.mock('alt-server', () => ({
    default: { log: vi.fn() },
    log: vi.fn(),
}));

import {
    buildPropertyInteriorEnterPayload,
    hasConfiguredPropertyInterior,
    type Property,
} from '../../../src/plugins/gta-mysql-core/server/services/PropertyService.js';

function baseProperty(overrides: Partial<Property> = {}): Property {
    return {
        id: 1,
        name: 'Test',
        price: 1,
        owner_player_id: null,
        pos_x: 0,
        pos_y: 0,
        pos_z: 0,
        interior_x: 10,
        interior_y: 20,
        interior_z: 30,
        interior_heading: 90,
        ipl: 'hei_hw1_blimp_interior_v_motel_milo_',
        purchased_at: null,
        garage_slots: 0,
        garage_x: null,
        garage_y: null,
        garage_z: null,
        garage_heading: 0,
        ...overrides,
    };
}

describe('property interior helpers', () => {
    describe('hasConfiguredPropertyInterior', () => {
        it('returns false for 0,0,0 interior', () => {
            expect(hasConfiguredPropertyInterior(baseProperty({ interior_x: 0, interior_y: 0, interior_z: 0 }))).toBe(
                false,
            );
        });

        it('returns false for non-finite coords', () => {
            expect(hasConfiguredPropertyInterior(baseProperty({ interior_x: NaN }))).toBe(false);
        });

        it('returns true when at least one non-zero finite interior coord', () => {
            expect(hasConfiguredPropertyInterior(baseProperty({ interior_x: 0, interior_y: 0, interior_z: 1 }))).toBe(
                true,
            );
        });
    });

    describe('buildPropertyInteriorEnterPayload', () => {
        it('returns null when interior not configured', () => {
            expect(
                buildPropertyInteriorEnterPayload(baseProperty({ interior_x: 0, interior_y: 0, interior_z: 0 })),
            ).toBe(null);
        });

        it('returns payload with numbers and optional ipl', () => {
            const p = baseProperty({ ipl: 'some_ipl' });
            expect(buildPropertyInteriorEnterPayload(p)).toEqual({
                x: 10,
                y: 20,
                z: 30,
                heading: 90,
                ipl: 'some_ipl',
            });
        });

        it('omits ipl when null', () => {
            const p = baseProperty({ ipl: null });
            expect(buildPropertyInteriorEnterPayload(p)).toEqual({
                x: 10,
                y: 20,
                z: 30,
                heading: 90,
            });
        });

        it('uses heading 0 when interior_heading is NaN', () => {
            const p = baseProperty({ interior_heading: NaN as unknown as number });
            const payload = buildPropertyInteriorEnterPayload(p);
            expect(payload?.heading).toBe(0);
        });
    });
});
