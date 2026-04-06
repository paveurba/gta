import { describe, expect, it, vi } from 'vitest';

vi.mock('alt-server', () => ({
    default: {},
    log: vi.fn(),
    logWarning: vi.fn(),
}));

import {
    getDefaultAppearance,
    rowToAppearance,
    type CharacterAppearanceRow,
} from '../../../src/plugins/gta-mysql-core/server/services/AppearanceService.js';

describe('getDefaultAppearance', () => {
    it('returns sex and default structure length 20', () => {
        const a = getDefaultAppearance(1);
        expect(a.sex).toBe(1);
        expect(a.structure).toHaveLength(20);
        expect(a.headOverlays).toEqual([]);
    });
});

describe('rowToAppearance', () => {
    it('maps snake_case row to camelCase appearance', () => {
        const row: CharacterAppearanceRow = {
            id: 1,
            player_id: 2,
            sex: 1,
            face_father: 10,
            face_mother: 20,
            skin_father: 0,
            skin_mother: 0,
            face_mix: 0.5,
            skin_mix: 0.5,
            structure: null,
            hair: 5,
            hair_dlc: 0,
            hair_color1: 0,
            hair_color2: 0,
            hair_overlay_collection: null,
            hair_overlay_name: null,
            facial_hair: 0,
            facial_hair_opacity: 1,
            facial_hair_color1: 0,
            eyebrows: 0,
            eyebrows_opacity: 1,
            eyebrows_color1: 0,
            chest_hair: 0,
            chest_hair_opacity: 1,
            chest_hair_color1: 0,
            eyes: 0,
            head_overlays: null,
            tattoos: null,
        };
        const app = rowToAppearance(row);
        expect(app.faceFather).toBe(10);
        expect(app.faceMother).toBe(20);
        expect(app.hair).toBe(5);
    });

    it('parses JSON structure when present', () => {
        const json = JSON.stringify([1, 2, 3]);
        const row: CharacterAppearanceRow = {
            id: 1,
            player_id: 2,
            sex: 0,
            face_father: 0,
            face_mother: 0,
            skin_father: 0,
            skin_mother: 0,
            face_mix: 0,
            skin_mix: 0,
            structure: json,
            hair: 0,
            hair_dlc: 0,
            hair_color1: 0,
            hair_color2: 0,
            hair_overlay_collection: null,
            hair_overlay_name: null,
            facial_hair: 0,
            facial_hair_opacity: 0,
            facial_hair_color1: 0,
            eyebrows: 0,
            eyebrows_opacity: 0,
            eyebrows_color1: 0,
            chest_hair: 0,
            chest_hair_opacity: 0,
            chest_hair_color1: 0,
            eyes: 0,
            head_overlays: null,
            tattoos: null,
        };
        expect(rowToAppearance(row).structure?.slice(0, 3)).toEqual([1, 2, 3]);
    });
});
