import type { Pool } from 'mysql2/promise';

/**
 * Thin wrapper around mysql2 pool with named placeholders (`:name`).
 * Used by legacy repositories; pool must be created with `namedPlaceholders: true`.
 */
export class DatabaseService {
    constructor(private readonly pool: Pool) {}

    async query<T>(sql: string, params: Record<string, unknown>): Promise<T[]> {
        const [rows] = await this.pool.execute(sql, params as Record<string, string | number | boolean | null>);
        return rows as T[];
    }

    async execute(sql: string, params: Record<string, unknown>): Promise<void> {
        await this.pool.execute(sql, params as Record<string, string | number | boolean | null>);
    }
}
