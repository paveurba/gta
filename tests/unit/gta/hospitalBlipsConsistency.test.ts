import { describe, expect, it } from 'vitest';

import { HOSPITALS } from '../../../src/plugins/gta-mysql-core/client/constants.js';
import { HOSPITAL_SPAWNS } from '../../../src/plugins/gta-mysql-core/server/world/nearestHospital.js';

/**
 * Map blips use street-level coords; respawn uses separate street spawns.
 * This test locks the *set of hospital names* so they stay aligned for players.
 */
describe('hospital names: client blips vs server respawn', () => {
    it('same four facility names in the same order', () => {
        const blipNames = HOSPITALS.map((h) => h.name);
        const spawnNames = HOSPITAL_SPAWNS.map((h) => h.name);
        expect(blipNames).toEqual(spawnNames);
    });
});
