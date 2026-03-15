import * as alt from 'alt-server';
import mysql from 'mysql2/promise';
import type { Appearance, AppearanceInfo } from '@Shared/types/appearance.js';

/** DB row shape for character_appearance (snake_case). */
export interface CharacterAppearanceRow {
    id: number;
    player_id: number;
    sex: number;
    face_father: number;
    face_mother: number;
    skin_father: number;
    skin_mother: number;
    face_mix: number;
    skin_mix: number;
    structure: string | null;
    hair: number;
    hair_dlc: number;
    hair_color1: number;
    hair_color2: number;
    hair_overlay_collection: string | null;
    hair_overlay_name: string | null;
    facial_hair: number;
    facial_hair_opacity: number;
    facial_hair_color1: number;
    eyebrows: number;
    eyebrows_opacity: number;
    eyebrows_color1: number;
    chest_hair: number;
    chest_hair_opacity: number;
    chest_hair_color1: number;
    eyes: number;
    head_overlays: string | null;
    tattoos: string | null;
}

/** Default face structure (20 values, -1.0 to 1.0). */
const DEFAULT_STRUCTURE = new Array(20).fill(0) as number[];

/**
 * Returns a default appearance for the given sex.
 * Used when a player has no saved appearance (e.g. first login).
 */
export function getDefaultAppearance(sex: 0 | 1): Partial<Appearance> {
    return {
        sex,
        faceFather: 0,
        faceMother: 0,
        skinFather: 0,
        skinMother: 0,
        faceMix: 0.5,
        skinMix: 0.5,
        structure: [...DEFAULT_STRUCTURE],
        hair: 0,
        hairDlc: 0,
        hairColor1: 0,
        hairColor2: 0,
        hairOverlay: { overlay: 'default', collection: 'default' },
        facialHair: 0,
        facialHairOpacity: 0,
        facialHairColor1: 0,
        eyebrows: 0,
        eyebrowsOpacity: 0,
        eyebrowsColor1: 0,
        chestHair: 0,
        chestHairOpacity: 0,
        chestHairColor1: 0,
        eyes: 0,
        headOverlays: [],
        tattoos: [],
    };
}

/**
 * Maps a DB row (snake_case) to Partial<Appearance> (camelCase) for Rebar apply().
 */
export function rowToAppearance(row: CharacterAppearanceRow): Partial<Appearance> {
    let structure: number[] = [...DEFAULT_STRUCTURE];
    if (row.structure) {
        try {
            const parsed = JSON.parse(row.structure) as number[];
            if (Array.isArray(parsed)) structure = parsed.slice(0, 20);
        } catch (_) {}
    }

    let headOverlays: AppearanceInfo[] = [];
    if (row.head_overlays) {
        try {
            const parsed = JSON.parse(row.head_overlays) as AppearanceInfo[];
            if (Array.isArray(parsed)) headOverlays = parsed;
        } catch (_) {}
    }

    let tattoos: { overlay: string; collection: string }[] = [];
    if (row.tattoos) {
        try {
            const parsed = JSON.parse(row.tattoos) as { overlay: string; collection: string }[];
            if (Array.isArray(parsed)) tattoos = parsed;
        } catch (_) {}
    }

    const hairOverlay =
        row.hair_overlay_collection && row.hair_overlay_name
            ? { collection: row.hair_overlay_collection, overlay: row.hair_overlay_name }
            : { overlay: 'default', collection: 'default' };

    return {
        sex: row.sex,
        faceFather: row.face_father,
        faceMother: row.face_mother,
        skinFather: row.skin_father,
        skinMother: row.skin_mother,
        faceMix: row.face_mix,
        skinMix: row.skin_mix,
        structure,
        hair: row.hair,
        hairDlc: row.hair_dlc,
        hairColor1: row.hair_color1,
        hairColor2: row.hair_color2,
        hairOverlay,
        facialHair: row.facial_hair,
        facialHairOpacity: row.facial_hair_opacity,
        facialHairColor1: row.facial_hair_color1,
        eyebrows: row.eyebrows,
        eyebrowsOpacity: row.eyebrows_opacity,
        eyebrowsColor1: row.eyebrows_color1,
        chestHair: row.chest_hair,
        chestHairOpacity: row.chest_hair_opacity,
        chestHairColor1: row.chest_hair_color1,
        eyes: row.eyes,
        headOverlays,
        tattoos,
    };
}

export class AppearanceService {
    constructor(private pool: mysql.Pool) {}

    async loadAppearance(playerId: number): Promise<Partial<Appearance> | null> {
        const [rows] = await this.pool.execute<CharacterAppearanceRow[]>(
            'SELECT * FROM character_appearance WHERE player_id = ?',
            [playerId]
        );
        const row = Array.isArray(rows) ? rows[0] : (rows as any)?.[0];
        if (!row) return null;
        return rowToAppearance(row);
    }

    /**
     * Load appearance for player; if none exists, create and save default then return it.
     */
    async loadOrCreateDefaultAppearance(playerId: number, sex: 0 | 1 = 1): Promise<Partial<Appearance>> {
        const existing = await this.loadAppearance(playerId);
        if (existing) return existing;
        const defaultApp = getDefaultAppearance(sex);
        await this.saveAppearance(playerId, defaultApp);
        return defaultApp;
    }

    async saveAppearance(playerId: number, data: Partial<Appearance>): Promise<void> {
        const structureJson = data.structure ? JSON.stringify(data.structure) : null;
        const headOverlaysJson = data.headOverlays?.length ? JSON.stringify(data.headOverlays) : null;
        const tattoosJson = data.tattoos?.length ? JSON.stringify(data.tattoos) : null;
        const hairOverlayCollection = data.hairOverlay?.collection ?? null;
        const hairOverlayName = data.hairOverlay?.overlay ?? null;

        await this.pool.execute(
            `INSERT INTO character_appearance (
                player_id, sex, face_father, face_mother, skin_father, skin_mother,
                face_mix, skin_mix, structure, hair, hair_dlc, hair_color1, hair_color2,
                hair_overlay_collection, hair_overlay_name,
                facial_hair, facial_hair_opacity, facial_hair_color1,
                eyebrows, eyebrows_opacity, eyebrows_color1,
                chest_hair, chest_hair_opacity, chest_hair_color1, eyes,
                head_overlays, tattoos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                sex = VALUES(sex), face_father = VALUES(face_father), face_mother = VALUES(face_mother),
                skin_father = VALUES(skin_father), skin_mother = VALUES(skin_mother),
                face_mix = VALUES(face_mix), skin_mix = VALUES(skin_mix), structure = VALUES(structure),
                hair = VALUES(hair), hair_dlc = VALUES(hair_dlc), hair_color1 = VALUES(hair_color1), hair_color2 = VALUES(hair_color2),
                hair_overlay_collection = VALUES(hair_overlay_collection), hair_overlay_name = VALUES(hair_overlay_name),
                facial_hair = VALUES(facial_hair), facial_hair_opacity = VALUES(facial_hair_opacity), facial_hair_color1 = VALUES(facial_hair_color1),
                eyebrows = VALUES(eyebrows), eyebrows_opacity = VALUES(eyebrows_opacity), eyebrows_color1 = VALUES(eyebrows_color1),
                chest_hair = VALUES(chest_hair), chest_hair_opacity = VALUES(chest_hair_opacity), chest_hair_color1 = VALUES(chest_hair_color1),
                eyes = VALUES(eyes), head_overlays = VALUES(head_overlays), tattoos = VALUES(tattoos)`,
            [
                playerId,
                data.sex ?? 1,
                data.faceFather ?? 0,
                data.faceMother ?? 0,
                data.skinFather ?? 0,
                data.skinMother ?? 0,
                data.faceMix ?? 0.5,
                data.skinMix ?? 0.5,
                structureJson,
                data.hair ?? 0,
                data.hairDlc ?? 0,
                data.hairColor1 ?? 0,
                data.hairColor2 ?? 0,
                hairOverlayCollection,
                hairOverlayName,
                data.facialHair ?? 0,
                data.facialHairOpacity ?? 0,
                data.facialHairColor1 ?? 0,
                data.eyebrows ?? 0,
                data.eyebrowsOpacity ?? 0,
                data.eyebrowsColor1 ?? 0,
                data.chestHair ?? 0,
                data.chestHairOpacity ?? 0,
                data.chestHairColor1 ?? 0,
                data.eyes ?? 0,
                headOverlaysJson,
                tattoosJson,
            ]
        );
    }
}
