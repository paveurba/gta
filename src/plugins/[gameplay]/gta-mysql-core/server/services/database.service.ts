import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { dbConfig } from '../database/config.js';

export class DatabaseService {
    private readonly pool: Pool;

    constructor() {
        this.pool = mysql.createPool({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.name,
            connectionLimit: dbConfig.connectionLimit,
            waitForConnections: true,
            namedPlaceholders: true,
        });
    }

    async healthcheck(): Promise<void> {
        await this.pool.query('SELECT 1');
    }

    async query<T extends RowDataPacket[]>(sql: string, params?: unknown[] | Record<string, unknown>): Promise<T> {
        const [rows] = await this.pool.query<T>(sql, params as never);
        return rows;
    }

    async execute(sql: string, params?: unknown[] | Record<string, unknown>): Promise<void> {
        await this.pool.execute(sql, params as never);
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
