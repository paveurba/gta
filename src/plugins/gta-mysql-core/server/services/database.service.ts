import { dbConfig } from '../database/config.js';

type QueryRows = unknown[];

type PoolLike = {
    query: (sql: string, params?: unknown) => Promise<[unknown, unknown]>;
    execute: (sql: string, params?: unknown) => Promise<[unknown, unknown]>;
    end: () => Promise<void>;
};

export class DatabaseService {
    private pool: PoolLike | null = null;

    private async getPool(): Promise<PoolLike> {
        if (this.pool) {
            return this.pool;
        }

        const mysql = await import('mysql2/promise');
        this.pool = mysql.default.createPool({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.name,
            connectionLimit: dbConfig.connectionLimit,
            waitForConnections: true,
            namedPlaceholders: true,
            connectTimeout: 3000,
        }) as unknown as PoolLike;

        return this.pool;
    }

    async healthcheck(): Promise<void> {
        const pool = await this.getPool();
        await Promise.race([
            pool.query('SELECT 1'),
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('MySQL healthcheck timeout')), 3000);
            }),
        ]);
    }

    async query<T extends QueryRows>(sql: string, params?: unknown[] | Record<string, unknown>): Promise<T> {
        const pool = await this.getPool();
        const [rows] = await pool.query(sql, params as never);
        return rows as T;
    }

    async execute(sql: string, params?: unknown[] | Record<string, unknown>): Promise<void> {
        const pool = await this.getPool();
        await pool.execute(sql, params as never);
    }

    async close(): Promise<void> {
        if (!this.pool) {
            return;
        }

        await this.pool.end();
        this.pool = null;
    }
}
