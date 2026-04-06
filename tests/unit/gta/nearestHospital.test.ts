import { describe, expect, it } from 'vitest';

import {
    HOSPITAL_SPAWNS,
    getNearestHospital,
    type HospitalSpawn,
} from '../../../src/plugins/gta-mysql-core/server/world/nearestHospital.js';

describe('getNearestHospital', () => {
    const a: HospitalSpawn = { x: 0, y: 0, z: 0, heading: 0, name: 'A' };
    const b: HospitalSpawn = { x: 100, y: 0, z: 0, heading: 0, name: 'B' };

    it('returns the only spawn in a single-entry list', () => {
        expect(getNearestHospital(50, 50, 0, [a])).toEqual(a);
    });

    it('picks closer spawn by 3D distance', () => {
        expect(getNearestHospital(10, 0, 0, [a, b])).toEqual(a);
        expect(getNearestHospital(95, 0, 0, [a, b])).toEqual(b);
    });

    it('defaults to production HOSPITAL_SPAWNS', () => {
        const nearPillbox = getNearestHospital(300, -600, 40);
        expect(nearPillbox.name).toBe('Pillbox Hill Medical Center');
    });

    it('exports four hospitals', () => {
        expect(HOSPITAL_SPAWNS).toHaveLength(4);
    });
});
