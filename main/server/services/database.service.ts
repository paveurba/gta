import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { databaseConfig } from '../database/config';

export class DatabaseService {
  private readonly pool: Pool;

  public constructor() {
    this.pool = mysql.createPool({
      host: databaseConfig.host,
      port: databaseConfig.port,
      user: databaseConfig.user,
      password: databaseConfig.password,
      database: databaseConfig.name,
      connectionLimit: databaseConfig.connectionLimit,
      waitForConnections: true,
      namedPlaceholders: true,
    });
  }

  public async healthcheck(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  public async query<T extends RowDataPacket[]>(sql: string, params?: unknown[] | Record<string, unknown>): Promise<T> {
    const [rows] = await this.pool.query<T>(sql, params as never);
    return rows;
  }

  public async execute(sql: string, params?: unknown[] | Record<string, unknown>): Promise<void> {
    await this.pool.execute(sql, params as never);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
